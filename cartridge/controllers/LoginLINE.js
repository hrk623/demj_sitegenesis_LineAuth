/**
* Description of the Controller and the logic it provides
*
* @module  controllers/LoginLINE
*/

'use strict';

var OAuthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var LOGGER = dw.system.Logger.getLogger('login');

/**
 * Invalidates the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthFailed() {
    app.getForm('oauthlogin').get('loginsucceeded').invalidate();
    finishOAuthLogin();
}

/**
 * Clears the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthSuccess() {
    app.getForm('oauthlogin').clear();
    finishOAuthLogin();
}


/**
 * Internal helper function to finish the OAuth login.
 * Redirects user to the location set in either the
 * {@link module:controllers/Login~handleOAuthLoginForm|handleOAuthLoginForm} function
 */
function finishOAuthLogin() {
    // To continue to the destination that is already preserved in the session.
    var location = getTargetUrl().toString();
    response.redirect(location);
}

function getTargetUrl () {
    if (session.custom.TargetLocation) {
        var target = session.custom.TargetLocation;
        delete session.custom.TargetLocation;
        //@TODO make sure only path, no hosts are allowed as redirect target
        dw.system.Logger.info('Redirecting to "{0}" after successful login', target);
        return decodeURI(target);
    } else {
        return URLUtils.https('Account-EditProfile');
    }
}


/**
 * This function is called after authentication by an external oauth provider.
 * If the user is successfully authenticated, the provider returns an authentication code,
 * this function exchanges the code for a token and with that token requests  the user information specified by
 *  the configured scope (id, first/last name, email, etc.) from the provider.
 * If the token exchange succeeds, calls the {@link module:controllers/LoginLINE~oAuthSuccess|oAuthSuccess} function.
 * If the token exchange fails, calls the {@link module:controllers/LoginLINE~oAuthFailed|oAuthFailed} function.
 * The function also handles multiple error conditions and logs them.
*/
function handleOAuthReentry() {
	LOGGER.debug('====== START handleOAuthReentry =======');

	var accessTokenResponse, oAuthProviderID, accessToken, userId, credentials;

	// Get the access token from LINE OAuth service
	accessTokenResponse = OAuthLoginFlowMgr.obtainAccessToken();
	if (accessTokenResponse) {
		oAuthProviderID = accessTokenResponse.oauthProviderId;
	    accessToken     = accessTokenResponse.accessToken;
	}
	LOGGER.debug('oAuthProviderID: {0}, accessToken: {1}', oAuthProviderID, accessToken);
	
    // Preserve the rememberMe cookie and drop it form the current session
    var rememberMe = session.custom.RememberMe;
    delete session.custom.RememberMe;
	
    // Get the user info from LINE
	 if (oAuthProviderID === 'LINE' && accessToken) {
	    userInfo = getUserInfo(accessToken);
	 }
	 LOGGER.debug('userInfo: {0}', JSON.stringify(userInfo));
	 
	// Get a customer to login from Customer records if exists, otherwise create one.
	 if (userInfo){
	    userId = userInfo.userId;
	    customer = getCustomer(oAuthProviderID, userId);  
	 }
    
	 // Get redentials to login
    if (customer && customer.getProfile()) {
    	credentials = customer.getProfile().getCredentials();
    }
    
    if (credentials && credentials.isEnabled()) {
        Transaction.wrap(function () {
            dw.customer.CustomerMgr.loginExternallyAuthenticatedCustomer(oAuthProviderID, userId, rememberMe);
        });
        LOGGER.debug('Logged in external customer with id: {0}', userId);
        
        return oAuthSuccess();
    } else {
        LOGGER.warn('Customer attempting to login into a disabled profile: {0} with id: {1}',
            profile.getCustomer().getCustomerNo(), userId);
        return oAuthFailed();
    }
}


function getCustomer (oAuthProviderID, userId) {
	var customerProfile, customer;
	
	if (oAuthProviderID && userId){
    	customerProfile = dw.customer.CustomerMgr.getExternallyAuthenticatedCustomerProfile(oAuthProviderID, userId);
    }

    if (!customerProfile && userId) {
        Transaction.wrap(function () {
            customer = dw.customer.CustomerMgr.createExternallyAuthenticatedCustomer(oAuthProviderID, userId);
            customerProfile = customer.getProfile();
            //customerProfile.setFirstName('N/A');
            //customerProfile.setLastName('N/A');
            //customerProfile.setEmail(userId + '@example.com');
        });
     } else {
        customer = customerProfile.getCustomer();
     }
    
     return customer;
}




/**
 * Get LINE UserInfo via dedicated requests.
 * @param  {String} accessToken The OAuth access token.
 * @return {String}             UserInfo.
 * @todo Migrate httpClient calls to dw.svc.*
 */
function getUserInfo(accessToken) {
	if (!accessToken) return null;
	
    var http, urlProfile, responseBody, userInfo;
    
    http = new dw.net.HTTPClient();
    urlProfile = 'https://api.line.me/v2/profile';
    
    http.setTimeout(30000);
    http.open('GET', urlProfile);
    http.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    http.send();
    
    responseBody = http.getText();
    if (http.statusCode === 200 && responseBody) {
    	userInfo = JSON.parse(http.getText());
    } else {
    	LOGGER.warn('Got an error calling:' + urlProfile +
                '. The status code is:' + http.statusCode + ' ,the text is:' + responseBody +
                ' and the error text is:' + http.getErrorText());
    }
    
    return userInfo;
}


/** Exchanges a user authentication code for a token and requests user information from an OAUTH provider.
 * @see module:controllers/LoginLINE~handleOAuthReentry */
exports.OAuthReentry = guard.ensure(['https','get'], handleOAuthReentry);
