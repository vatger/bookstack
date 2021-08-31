<?php
/**
 * Settings text strings
 * Contains all text strings used in the general settings sections of BookStack
 * including users and roles.
 */
return [

    // Common Messages
    'settings' => 'Instellingen',
    'settings_save' => 'Instellingen opslaan',
    'settings_save_success' => 'Instellingen Opgeslagen',

    // App Settings
    'app_customization' => 'Aanpassingen',
    'app_features_security' => 'Functies en beveiliging',
    'app_name' => 'Applicatienaam',
    'app_name_desc' => 'De applicatienaam wordt in e-mails in in de header weergegeven.',
    'app_name_header' => 'Applicatienaam in de header weergeven?',
    'app_public_access' => 'Openbare toegang',
    'app_public_access_desc' => 'Door deze optie in te schakelen, krijgen bezoekers die niet zijn ingelogd, toegang tot content in je BookStack.',
    'app_public_access_desc_guest' => 'Toegang voor openbare bezoekers kan worden gecontroleerd via de "Guest" gebruiker.',
    'app_public_access_toggle' => 'Openbare toegang toestaan',
    'app_public_viewing' => 'Publieke bewerkingen toestaan?',
    'app_secure_images' => 'Beter beveiligide afbeeldingen gebruiken?',
    'app_secure_images_toggle' => 'Hogere beveiliging geuploade afbeeldingen inschakelen',
    'app_secure_images_desc' => 'Omwille van de performance zijn alle afbeeldingen publiek toegankelijk. Zorg ervoor dat je de \'directory index\' niet hebt ingeschakeld.',
    'app_editor' => 'Pagina Bewerken',
    'app_editor_desc' => 'Selecteer welke tekstverwerker je wilt gebruiken.',
    'app_custom_html' => 'Speciale HTML toevoegen',
    'app_custom_html_desc' => 'Alles wat je hier toevoegd wordt in de <head> sectie van elke pagina meengenomen. Dit kun je bijvoorbeeld voor analytics gebruiken.',
    'app_custom_html_disabled_notice' => 'Aangepaste HTML-hoofd-inhoud is uitgeschakeld op deze instellingenpagina om ervoor te zorgen dat breekbare wijzigingen ongedaan gemaakt kunnen worden.',
    'app_logo' => 'Applicatielogo',
    'app_logo_desc' => 'De afbeelding moet 43px hoog zijn. <br>Grotere afbeeldingen worden geschaald.',
    'app_primary_color' => 'Applicatie hoofdkleur',
    'app_primary_color_desc' => 'Geef een hexadecimale waarde. <br>Als je niks invult wordt de standaardkleur gebruikt.',
    'app_homepage' => 'Applicatie Homepagina',
    'app_homepage_desc' => 'Selecteer een weergave om weer te geven op de homepage in plaats van de standaard weergave. Paginarechten worden genegeerd voor geselecteerde pagina\'s.',
    'app_homepage_select' => 'Selecteer een pagina',
    'app_footer_links' => 'Voettekst links',
    'app_footer_links_desc' => 'Voeg links toe om te laten zien in de voettekst van de site. Deze worden onderaan de meeste pagina\'s weergegeven, met inbegrip van pagina\'s die geen inloggen vereisen. U kunt een label van "trans::<key>" gebruiken om systeemgedefinieerde vertalingen te gebruiken. Bijvoorbeeld: Het gebruik van "trans:common.privacy_policy" biedt de vertaalde tekst "Privacybeleid" en "trans:common.terms_of_service" voor de vertaalde tekst "Servicevoorwaarden".',
    'app_footer_links_label' => 'Link label',
    'app_footer_links_url' => 'Link URL',
    'app_footer_links_add' => 'Voettekst link toevoegen',
    'app_disable_comments' => 'Reacties uitschakelen',
    'app_disable_comments_toggle' => 'Opmerkingen uitschakelen',
    'app_disable_comments_desc' => 'Schakel opmerkingen uit op alle pagina\'s in de applicatie. Bestaande opmerkingen worden niet getoond.',

    // Color settings
    'content_colors' => 'Kleuren inhoud',
    'content_colors_desc' => 'Stelt de kleuren in voor alle elementen in de pagina-organisatieleiding. Het kiezen van kleuren met dezelfde helderheid als de standaard kleuren wordt aanbevolen voor de leesbaarheid.',
    'bookshelf_color' => 'Kleur van de Boekenplank',
    'book_color' => 'Kleur van het Boek',
    'chapter_color' => 'Kleur van het Hoofdstuk',
    'page_color' => 'Pagina kleur',
    'page_draft_color' => 'Klad pagina kleur',

    // Registration Settings
    'reg_settings' => 'Registratieinstellingen',
    'reg_enable' => 'Registratie inschakelen',
    'reg_enable_toggle' => 'Registratie inschakelen',
    'reg_enable_desc' => 'Wanneer registratie is ingeschakeld, kan de gebruiker zich aanmelden als een gebruiker. Na registratie krijgen ze een enkele, standaard gebruikersrol.',
    'reg_default_role' => 'Standaard rol na registratie',
    'reg_enable_external_warning' => 'De optie hierboven wordt niet gebruikt terwijl LDAP authenticatie actief is. Gebruikersaccounts voor niet-bestaande leden zullen automatisch worden gecreëerd als authenticatie tegen het gebruikte LDAP-systeem succesvol is.',
    'reg_email_confirmation' => 'E-mail bevestiging',
    'reg_email_confirmation_toggle' => 'E-mailbevestiging verplichten',
    'reg_confirm_email_desc' => 'Als domeinrestricties aan staan dan is altijd e-maibevestiging nodig. Onderstaande instelling wordt dan genegeerd.',
    'reg_confirm_restrict_domain' => 'Beperk registratie tot een maildomein',
    'reg_confirm_restrict_domain_desc' => 'Geen een komma-gescheiden lijst van domeinnamen die gebruikt mogen worden bij registratie. <br> Let op: na registratie kunnen gebruikers hun e-mailadres nog steeds wijzigen.',
    'reg_confirm_restrict_domain_placeholder' => 'Geen beperkingen ingesteld',

    // Maintenance settings
    'maint' => 'Onderhoud',
    'maint_image_cleanup' => 'Afbeeldingen opschonen',
    'maint_image_cleanup_desc' => "Scant pagina- en revisie inhoud om te controleren welke afbeeldingen en tekeningen momenteel worden gebruikt en welke afbeeldingen overbodig zijn. Zorg ervoor dat je een volledige database en afbeelding backup maakt voordat je dit uitvoert.",
    'maint_delete_images_only_in_revisions' => 'Ook afbeeldingen die alleen in oude pagina revisies bestaan verwijderen',
    'maint_image_cleanup_run' => 'Opschonen uitvoeren',
    'maint_image_cleanup_warning' => ':count potentieel ongebruikte afbeeldingen gevonden. Weet u zeker dat u deze afbeeldingen wilt verwijderen?',
    'maint_image_cleanup_success' => ':count potentieel ongebruikte afbeeldingen gevonden en verwijderd!',
    'maint_image_cleanup_nothing_found' => 'Geen ongebruikte afbeeldingen gevonden, niets verwijderd!',
    'maint_send_test_email' => 'Stuur een test e-mail',
    'maint_send_test_email_desc' => 'Dit verstuurt een test e-mail naar het e-mailadres dat je in je profiel hebt opgegeven.',
    'maint_send_test_email_run' => 'Test e-mail verzenden',
    'maint_send_test_email_success' => 'E-mail verzonden naar :address',
    'maint_send_test_email_mail_subject' => 'Test E-mail',
    'maint_send_test_email_mail_greeting' => 'E-mailbezorging lijkt te werken!',
    'maint_send_test_email_mail_text' => 'Gefeliciteerd! Nu je deze e-mailmelding hebt ontvangen, lijken je e-mailinstellingen correct te zijn geconfigureerd.',
    'maint_recycle_bin_desc' => 'Verwijderde planken, boeken, hoofdstukken en pagina\'s worden naar de prullenbak gestuurd om ze te herstellen of definitief te verwijderen. Oudere items in de prullenbak kunnen automatisch worden verwijderd, afhankelijk van de systeemconfiguratie.',
    'maint_recycle_bin_open' => 'Prullenbak openen',

    // Recycle Bin
    'recycle_bin' => 'Prullenbak',
    'recycle_bin_desc' => 'Hier kunt u items herstellen die zijn verwijderd of kiezen om ze permanent te verwijderen uit het systeem. Deze lijst is niet gefilterd, in tegenstelling tot vergelijkbare activiteitenlijsten in het systeem waar rechtenfilters worden toegepast.',
    'recycle_bin_deleted_item' => 'Verwijderde Item',
    'recycle_bin_deleted_parent' => 'Bovenliggende',
    'recycle_bin_deleted_by' => 'Verwijderd door',
    'recycle_bin_deleted_at' => 'Verwijdert op',
    'recycle_bin_permanently_delete' => 'Permanent verwijderen',
    'recycle_bin_restore' => 'Herstellen',
    'recycle_bin_contents_empty' => 'De prullenbak is momenteel leeg',
    'recycle_bin_empty' => 'Prullenbak legen',
    'recycle_bin_empty_confirm' => 'Dit zal permanent alle items in de prullenbak vernietigen, inclusief inhoud die in elk item zit. Weet u zeker dat u de prullenbak wilt legen?',
    'recycle_bin_destroy_confirm' => 'Deze actie zal dit item permanent verwijderen, samen met alle onderliggende elementen hieronder vanuit het systeem en u kunt deze inhoud niet herstellen. Weet u zeker dat u dit item permanent wilt verwijderen?',
    'recycle_bin_destroy_list' => 'Te vernietigen objecten',
    'recycle_bin_restore_list' => 'Items te herstellen',
    'recycle_bin_restore_confirm' => 'Deze actie herstelt het verwijderde item, inclusief alle onderliggende elementen, op hun oorspronkelijke locatie. Als de oorspronkelijke locatie sindsdien is verwijderd en zich nu in de prullenbak bevindt, zal ook het bovenliggende item moeten worden hersteld.',
    'recycle_bin_restore_deleted_parent' => 'De bovenliggende map van dit item is ook verwijderd. Deze zal worden verwijderd totdat het bovenliggende item ook is hersteld.',
    'recycle_bin_restore_parent' => 'Herstel bovenliggende',
    'recycle_bin_destroy_notification' => 'Verwijderde totaal :count items uit de prullenbak.',
    'recycle_bin_restore_notification' => 'Herstelde totaal :count items uit de prullenbak.',

    // Audit Log
    'audit' => 'Audit Log',
    'audit_desc' => 'Dit auditlogboek toont een lijst met activiteiten die in het systeem zijn gedaan. Deze lijst is niet gefilterd, in tegenstelling tot vergelijkbare activiteitenlijsten in het systeem waar rechtenfilters worden toegepast.',
    'audit_event_filter' => 'Gebeurtenis filter',
    'audit_event_filter_no_filter' => 'Geen filter',
    'audit_deleted_item' => 'Verwijderd Item',
    'audit_deleted_item_name' => 'Naam: :name',
    'audit_table_user' => 'Gebruiker',
    'audit_table_event' => 'Gebeurtenis',
    'audit_table_related' => 'Gerelateerd Item of Detail',
    'audit_table_date' => 'Activiteit datum',
    'audit_date_from' => 'Datum bereik vanaf',
    'audit_date_to' => 'Datum bereik tot',

    // Role Settings
    'roles' => 'Rollen',
    'role_user_roles' => 'Gebruikrollen',
    'role_create' => 'Nieuwe Rol Maken',
    'role_create_success' => 'Rol succesvol aangemaakt',
    'role_delete' => 'Rol Verwijderen',
    'role_delete_confirm' => 'Dit verwijdert de rol \':roleName\'.',
    'role_delete_users_assigned' => 'Er zijn :userCount gebruikers met deze rol. Selecteer hieronder een nieuwe rol als je deze gebruikers een andere rol wilt geven.',
    'role_delete_no_migration' => "Geen gebruikers migreren",
    'role_delete_sure' => 'Weet je zeker dat je deze rol wilt verwijderen?',
    'role_delete_success' => 'Rol succesvol verwijderd',
    'role_edit' => 'Rol Bewerken',
    'role_details' => 'Rol Details',
    'role_name' => 'Rolnaam',
    'role_desc' => 'Korte beschrijving van de rol',
    'role_mfa_enforced' => 'Requires Multi-Factor Authentication',
    'role_external_auth_id' => 'Externe authenticatie ID\'s',
    'role_system' => 'Systeem Permissies',
    'role_manage_users' => 'Gebruikers beheren',
    'role_manage_roles' => 'Rollen en rechten beheren',
    'role_manage_entity_permissions' => 'Beheer alle boeken-, hoofdstukken- en paginaresitrcties',
    'role_manage_own_entity_permissions' => 'Beheer restricties van je eigen boeken, hoofdstukken en pagina\'s',
    'role_manage_page_templates' => 'Paginasjablonen beheren',
    'role_access_api' => 'Ga naar systeem API',
    'role_manage_settings' => 'Beheer app instellingen',
    'role_export_content' => 'Export content',
    'role_asset' => 'Asset Permissies',
    'roles_system_warning' => 'Wees ervan bewust dat toegang tot een van de bovengenoemde drie machtigingen een gebruiker in staat kan stellen zijn eigen privileges of de privileges van anderen in het systeem te wijzigen. Wijs alleen rollen toe met deze machtigingen aan vertrouwde gebruikers.',
    'role_asset_desc' => 'Deze permissies bepalen de standaardtoegangsrechten. Permissies op boeken, hoofdstukken en pagina\'s overschrijven deze instelling.',
    'role_asset_admins' => 'Beheerders krijgen automatisch toegang tot alle inhoud, maar deze opties kunnen interface opties tonen of verbergen.',
    'role_all' => 'Alles',
    'role_own' => 'Eigen',
    'role_controlled_by_asset' => 'Gecontroleerd door de asset waar deze is geüpload',
    'role_save' => 'Rol Opslaan',
    'role_update_success' => 'Rol succesvol bijgewerkt',
    'role_users' => 'Gebruikers in deze rol',
    'role_users_none' => 'Geen enkele gebruiker heeft deze rol',

    // Users
    'users' => 'Gebruikers',
    'user_profile' => 'Gebruikersprofiel',
    'users_add_new' => 'Gebruiker toevoegen',
    'users_search' => 'Gebruiker zoeken',
    'users_latest_activity' => 'Laatste activiteit',
    'users_details' => 'Gebruiker details',
    'users_details_desc' => 'Stel een weergavenaam en e-mailadres in voor deze gebruiker. Het e-mailadres zal worden gebruikt om in te loggen.',
    'users_details_desc_no_email' => 'Stel een weergavenaam in voor deze gebruiker zodat anderen deze kunnen herkennen.',
    'users_role' => 'Gebruikersrollen',
    'users_role_desc' => 'Selecteer aan welke rollen deze gebruiker zal worden toegewezen. Als een gebruiker aan meerdere rollen wordt toegewezen worden de machtigingen van deze rollen samengevoegd en krijgen ze alle machtigingen van de toegewezen rollen.',
    'users_password' => 'Wachtwoord gebruiker',
    'users_password_desc' => 'Stel een wachtwoord in dat gebruikt wordt om in te loggen op de applicatie. Dit moet minstens 6 tekens lang zijn.',
    'users_send_invite_text' => 'U kunt ervoor kiezen om deze gebruiker een uitnodigingsmail te sturen waarmee hij zijn eigen wachtwoord kan instellen, anders kunt u zelf zijn wachtwoord instellen.',
    'users_send_invite_option' => 'Stuur gebruiker uitnodigings e-mail',
    'users_external_auth_id' => 'Externe authenticatie ID',
    'users_external_auth_id_desc' => 'Dit is het ID dat gebruikt wordt om deze gebruiker te vergelijken met uw externe verificatiesysteem.',
    'users_password_warning' => 'Vul onderstaande formulier alleen in als je het wachtwoord wilt aanpassen:',
    'users_system_public' => 'De eigenschappen van deze gebruiker worden voor elke gastbezoeker gebruikt. Er kan niet mee ingelogd worden en wordt automatisch toegewezen.',
    'users_delete' => 'Verwijder gebruiker',
    'users_delete_named' => 'Verwijder gebruiker :userName',
    'users_delete_warning' => 'Dit zal de gebruiker \':userName\' volledig uit het systeem verwijderen.',
    'users_delete_confirm' => 'Weet je zeker dat je deze gebruiker wilt verwijderen?',
    'users_migrate_ownership' => 'Draag eigendom over',
    'users_migrate_ownership_desc' => 'Selecteer een gebruiker hier als u wilt dat een andere gebruiker de eigenaar wordt van alle items die momenteel eigendom zijn van deze gebruiker.',
    'users_none_selected' => 'Geen gebruiker geselecteerd',
    'users_delete_success' => 'Gebruiker succesvol verwijderd',
    'users_edit' => 'Bewerk Gebruiker',
    'users_edit_profile' => 'Bewerk Profiel',
    'users_edit_success' => 'Gebruiker succesvol bijgewerkt',
    'users_avatar' => 'Avatar',
    'users_avatar_desc' => 'De afbeelding moet vierkant zijn en ongeveer 256px breed.',
    'users_preferred_language' => 'Voorkeurstaal',
    'users_preferred_language_desc' => 'Deze optie wijzigt de taal die gebruikt wordt voor de gebruikersinterface. Dit heeft geen invloed op de door de gebruiker gemaakte inhoud.',
    'users_social_accounts' => 'Sociale accounts',
    'users_social_accounts_info' => 'Hier kun je accounts verbinden om makkelijker in te loggen. Via je profiel kun je ook weer rechten intrekken die bij deze social accountsh horen.',
    'users_social_connect' => 'Account Verbinden',
    'users_social_disconnect' => 'Account Ontkoppelen',
    'users_social_connected' => ':socialAccount account is succesvol aan je profiel gekoppeld.',
    'users_social_disconnected' => ':socialAccount account is succesvol ontkoppeld van je profiel.',
    'users_api_tokens' => 'API Tokens',
    'users_api_tokens_none' => 'Er zijn geen API-tokens gemaakt voor deze gebruiker',
    'users_api_tokens_create' => 'Token aanmaken',
    'users_api_tokens_expires' => 'Verloopt',
    'users_api_tokens_docs' => 'API Documentatie',
    'users_mfa' => 'Multi-Factor Authentication',
    'users_mfa_desc' => 'Setup multi-factor authentication as an extra layer of security for your user account.',
    'users_mfa_x_methods' => ':count method configured|:count methods configured',
    'users_mfa_configure' => 'Configure Methods',

    // API Tokens
    'user_api_token_create' => 'API-token aanmaken',
    'user_api_token_name' => 'Naam',
    'user_api_token_name_desc' => 'Geef je token een leesbare naam als een toekomstige herinnering aan het beoogde doel.',
    'user_api_token_expiry' => 'Vervaldatum',
    'user_api_token_expiry_desc' => 'Stel een datum in waarop deze token verloopt. Na deze datum zullen aanvragen die met deze token zijn ingediend niet langer werken. Als dit veld leeg blijft, wordt een vervaldatum van 100 jaar in de toekomst ingesteld.',
    'user_api_token_create_secret_message' => 'Onmiddellijk na het aanmaken van dit token zal een "Token ID" en "Token Geheim" worden gegenereerd en weergegeven. Het geheim zal slechts één keer getoond worden. Kopieer de waarde dus eerst op een veilige plaats voordat u doorgaat.',
    'user_api_token_create_success' => 'API token succesvol aangemaakt',
    'user_api_token_update_success' => 'API token succesvol bijgewerkt',
    'user_api_token' => 'API Token',
    'user_api_token_id' => 'Token ID',
    'user_api_token_id_desc' => 'Dit is een niet bewerkbaar systeem gegenereerde id voor dit token dat moet worden verstrekt in API-verzoeken.',
    'user_api_token_secret' => 'Geheime token sleutel',
    'user_api_token_secret_desc' => 'Dit is een systeem gegenereerd geheim voor dit token dat moet worden verstrekt in API verzoeken. Dit wordt maar één keer weergegeven, dus kopieër deze waarde naar een veilige plaats.',
    'user_api_token_created' => 'Token gemaakt :timeAgo',
    'user_api_token_updated' => 'Token bijgewerkt :timeAgo',
    'user_api_token_delete' => 'Token Verwijderen',
    'user_api_token_delete_warning' => 'Dit zal de API-token met de naam \':tokenName\' volledig uit het systeem verwijderen.',
    'user_api_token_delete_confirm' => 'Weet u zeker dat u deze API-token wilt verwijderen?',
    'user_api_token_delete_success' => 'API-token succesvol verwijderd',

    //! If editing translations files directly please ignore this in all
    //! languages apart from en. Content will be auto-copied from en.
    //!////////////////////////////////
    'language_select' => [
        'en' => 'English',
        'ar' => 'العربية',
        'bg' => 'Bǎlgarski',
        'bs' => 'Bosanski',
        'ca' => 'Catalaans',
        'cs' => 'Česky',
        'da' => 'Dansk',
        'de' => 'Deutsch (Sie)',
        'de_informal' => 'Deutsch (Du)',
        'es' => 'Español',
        'es_AR' => 'Español Argentina',
        'fr' => 'Français',
        'he' => 'עברית',
        'hr' => 'Hrvatski',
        'hu' => 'Magyar',
        'id' => 'Bahasa Indonesia',
        'it' => 'Italian',
        'ja' => '日本語',
        'ko' => '한국어',
        'lt' => 'Lietuvių Kalba',
        'lv' => 'Latviešu Valoda',
        'nl' => 'Nederlands',
        'nb' => 'Norsk (Bokmål)',
        'pl' => 'Polski',
        'pt' => 'Português',
        'pt_BR' => 'Português do Brasil',
        'ru' => 'Русский',
        'sk' => 'Slovensky',
        'sl' => 'Slovenščina',
        'sv' => 'Svenska',
        'tr' => 'Türkçe',
        'uk' => 'Українська',
        'vi' => 'Tiếng Việt',
        'zh_CN' => '简体中文',
        'zh_TW' => '繁體中文',
    ]
    //!////////////////////////////////
];
