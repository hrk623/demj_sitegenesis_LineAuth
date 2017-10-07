# demj_sitegenesis_LineAuth

##Prerequisites
- This cartridge depends on sites cretaed based on Community SiteGenesis.
- This cartridge is provided strictly for your reference and has no support on any kind of questions or requestes.

##How to install
1. Clone this repository.
```bash
git clone https://github.com/hrk623/demj_sitegenesis_LineAuth.git
```
2. Import `demj_sitegenesis_LineAuth` project into UX Studio and upload the cartrige to your sanbox.
3. Add `demj_sitegenesis_LineAuth` to your cartridge path for the site.
4. Go to LINE Developer Console and create LINE Login Service with Web Login enabled.
-- make sure you set the callbacl URL to `https://[host]/on/demandware.store/[site id]/[locale]/LoginLINE-OAuthReentry`
5. Go to `Business Manager > Administration > Global Preferences > OAuth2 Providers` and create new provider as follows.
-- ID:　LINE
-- Description:　Commerce Cloud サイトに LINE アカウントでログインします。
-- Client ID: [Your LINE Login Channel]
-- Client Secret: [Your LINE Login Channel Secret]	
-- Scopes:	P
-- Authorization Url: https://access.line.me/dialog/oauth/weblogin
-- Token URL: https://api.line.me/v2/oauth/accessToken
-- User Info URL: https://api.line.me/v2/profile
-- User Info URL Access Token Name: access_token
-- Redirect Pipeline Name: LoginLINE-OAuthReentry
