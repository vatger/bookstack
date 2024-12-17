<?php
/**
 * Settings text strings
 * Contains all text strings used in the general settings sections of BookStack
 * including users and roles.
 */
return [

    // Common Messages
    'settings' => 'Postavke',
    'settings_save' => 'Spremi postavke',
    'system_version' => 'Sistemska Verzija',
    'categories' => 'Kategorije',

    // App Settings
    'app_customization' => 'Prilagođavanje',
    'app_features_security' => 'Značajke & Sigurnost',
    'app_name' => 'Ime aplikacije',
    'app_name_desc' => 'Ime je vidljivo u zaglavlju i svakoj sistemskoj poruci.',
    'app_name_header' => 'Prikaži ime u zaglavlju',
    'app_public_access' => 'Javni pristup',
    'app_public_access_desc' => 'Omogućavanje ove postavke pristup sadržaju imat će svi posjetitelji BookStack čak i ako nisu prijavljeni.',
    'app_public_access_desc_guest' => 'Javni pristup može se urediti putem opcije "Gost".',
    'app_public_access_toggle' => 'Dozvoli javni pristup',
    'app_public_viewing' => 'Dozvoljen javni pristup?',
    'app_secure_images' => 'Visoka razina sigurnosti prijenosa slika',
    'app_secure_images_toggle' => 'Omogući visoku sigurnost prijenosa slika',
    'app_secure_images_desc' => 'Zbog specifične izvedbe sve su slike javne. Osigurajte da indeksi direktorija nisu omogućeni kako bi se spriječio neovlašten pristup.',
    'app_default_editor' => 'Zadani Uređivač Stranica',
    'app_default_editor_desc' => 'Odaberite koji uređivač će se koristiti kao zadani prilikom uređivanja novih stranica. Ovo se može prebrisati na razini pojedine stranice ukoliko dozvole to omogućuju.',
    'app_custom_html' => 'Prilagođeni HTML sadržaj',
    'app_custom_html_desc' => 'Sav sadržaj dodan ovdje bit će umetnut na dno <glavne> stranice. To je korisno za stiliziranje i dodavanje analitičkog koda.',
    'app_custom_html_disabled_notice' => 'Prilagođeni HTML je onemogućen kako bi se osiguralo vraćanje promjena u slučaju kvara.',
    'app_logo' => 'Logo aplikacije',
    'app_logo_desc' => 'Ovo se koristi u zaglavlju aplikacije, među ostalim područjima. Ova slika treba biti visoka 86 piksela. Velike slike bit će smanjene.',
    'app_icon' => 'Ikona Aplikacije',
    'app_icon_desc' => 'Ova ikona se koristi za kartice preglednika i ikone prečaca. Trebala bi biti PNG slika kvadratnog oblika sa dimenzijama 256 piksela.',
    'app_homepage' => 'Glavna stranica aplikacije',
    'app_homepage_desc' => 'Odaberite prikaz svoje glavne stranice umjesto već zadane. Za odabrane stranice ne vrijede zadana dopuštenja.',
    'app_homepage_select' => 'Odaberi stranicu',
    'app_footer_links' => 'Podnožje',
    'app_footer_links_desc' => 'Odaberite poveznice koje će biti vidljive u podnožju većina stranica čak i na nekima koje ne zahtijevaju prijavu. Na primjer, oznaku "trans::common.privacy_policy" možete koristiti za sistemski definirani prijevod teksta "Politika Privatnosti", a za "Uvjete korištenja" možete koristiti "trans::common.terms_of_service".',
    'app_footer_links_label' => 'Oznaka veze',
    'app_footer_links_url' => 'Oznaka URL',
    'app_footer_links_add' => 'Dodaj vezu na podnožje',
    'app_disable_comments' => 'Onemogući komentare',
    'app_disable_comments_toggle' => 'Onemogući komentare',
    'app_disable_comments_desc' => 'Onemogući komentare za sve stranice u aplikaciji. <br> Postojeći komentari nisu prikazani.',

    // Color settings
    'color_scheme' => 'Paleta Boje Aplikacije',
    'color_scheme_desc' => 'Postavite boje koje će se koristiti u korisničkom sučelju aplikacije. Boje se mogu konfigurirati zasebno za tamni i svijetli način rada kako bi se najbolje uklopile u temu i osigurale čitljivost.',
    'ui_colors_desc' => 'Postavite primarnu boju aplikacije i zadane boje veza. Primarna boja se uglavnom koristi za zaglavlje trake, gumbe i dekoracije sučelja. Zadana boja veza se koristi za tekstualne veze i radnje, kako unutar sadržaja tako i u korisničkom sučelju aplikacije.',
    'app_color' => 'Primarnab Boja',
    'link_color' => 'Zadana Boja Veze',
    'content_colors_desc' => 'Postavite boje za sve elemente u hijerarhiji organizacije stranica. Preporučuje se odabir boja slične svjetlini kao zadane boje radi bolje čitljivosti.',
    'bookshelf_color' => 'Boja police',
    'book_color' => 'Boja knjige',
    'chapter_color' => 'Boja poglavlja',
    'page_color' => 'Boja stranice',
    'page_draft_color' => 'Boja nacrta',

    // Registration Settings
    'reg_settings' => 'Registracija',
    'reg_enable' => 'Omogući registraciju',
    'reg_enable_toggle' => 'Omogući registraciju',
    'reg_enable_desc' => 'Ako je omogućeno korisnik se može sam registrirati nakon čega će mu biti dodijeljena jedna od korisničkih uloga.',
    'reg_default_role' => 'Zadaj ulogu korisnika nakon registracije',
    'reg_enable_external_warning' => 'Gornja opcija se zanemaruje ako postoji LDAP ili SAML autorifikacija. Korisnički računi za nepostojeće članove automatski će se kreirati ako je vanjska provjera autentičnosti bila uspješna.',
    'reg_email_confirmation' => 'Potvrda e maila',
    'reg_email_confirmation_toggle' => 'Zahtjev za potvrdom e maila',
    'reg_confirm_email_desc' => 'Ako postoje ograničenja domene potvrda e maila će se zahtijevati i ova će se opcija zanemariti.',
    'reg_confirm_restrict_domain' => 'Ograničenja domene',
    'reg_confirm_restrict_domain_desc' => 'Unesite popis email domena kojima želite ograničiti registraciju i odvojite ih zarezom. Korisnicima će se slati email prije interakcije s aplikacijom. <br> Uzmite u obzir da će korisnici moći koristiti druge e mail adrese nakon uspješne registracije.',
    'reg_confirm_restrict_domain_placeholder' => 'Bez ograničenja',

    // Maintenance settings
    'maint' => 'Održavanje',
    'maint_image_cleanup' => 'Čišćenje slika',
    'maint_image_cleanup_desc' => 'Skenirajte sadržaj stranice i revizije kako biste provjerili koje slike i crteži se trenutno koriste i koje slike su suvišne. Pobrinite se napraviti potpunu sigurnosnu kopiju baze podataka i slika prije pokretanja ovog procesa.',
    'maint_delete_images_only_in_revisions' => 'Izbriši slike koje postoje u prijašnjim revizijama',
    'maint_image_cleanup_run' => 'Pokreni čišćenje',
    'maint_image_cleanup_warning' => ':count moguće neiskorištene slike. Jeste li sigurni da želite izbrisati ove slike?',
    'maint_image_cleanup_success' => ':count moguće neiskorištene slike su pronađene i izbrisane!',
    'maint_image_cleanup_nothing_found' => 'Nema neiskorištenih slika, Ništa nije izbrisano!',
    'maint_send_test_email' => 'Pošalji testni Email',
    'maint_send_test_email_desc' => 'Na ovaj način šaljete testni Email na adresu navedenu u vašem profilu.',
    'maint_send_test_email_run' => 'Pošalji testni email',
    'maint_send_test_email_success' => 'Email je poslan na :address',
    'maint_send_test_email_mail_subject' => 'Testni email',
    'maint_send_test_email_mail_greeting' => 'Email se može koristiti!',
    'maint_send_test_email_mail_text' => 'Čestitamo! Ako ste primili ovaj e mail znači da ćete ga moći koristiti.',
    'maint_recycle_bin_desc' => 'Izbrisane police, knjige, poglavlja i stranice poslane su u Recycle bin i mogu biti vraćene ili trajno izbrisane. Starije stavke bit će automatski izbrisane nakon nekog vremena što ovisi o konfiguraciji sustava.',
    'maint_recycle_bin_open' => 'Otvori Recycle Bin',
    'maint_regen_references' => 'Regeneriraj Reference',
    'maint_regen_references_desc' => 'Ova akcija će ponovno izgraditi indeks prekriženih referenci između stavki unutar baze podataka. Obično se to automatski obavlja, ali ova akcija može biti korisna za indeksiranje starih sadržaja ili sadržaja dodanih putem neoficijelnih metoda.',
    'maint_regen_references_success' => 'Indeks referenci je ponovno izgrađen!',
    'maint_timeout_command_note' => 'Napomena: Ova radnja može potrajati, što može dovesti do problema s prekidom veze (timeout) u nekim web okruženjima. Kao alternativa, ova radnja se može izvršiti putem naredbe u terminalu.',

    // Recycle Bin
    'recycle_bin' => 'Koš za smeće',
    'recycle_bin_desc' => 'Ovdje možete vratiti izbrisane stavke ili ih trajno ukloniti iz sustava. Popis nije filtriran kao što su to popisi u kojima su omogućeni filteri.',
    'recycle_bin_deleted_item' => 'Izbrisane stavke',
    'recycle_bin_deleted_parent' => 'Nadređeni',
    'recycle_bin_deleted_by' => 'Izbrisano od',
    'recycle_bin_deleted_at' => 'Vrijeme brisanja',
    'recycle_bin_permanently_delete' => 'Trajno izbrisano',
    'recycle_bin_restore' => 'Vrati',
    'recycle_bin_contents_empty' => 'Recycle Bin je prazan',
    'recycle_bin_empty' => 'Isprazni Recycle Bin',
    'recycle_bin_empty_confirm' => 'Ovo će trajno obrisati sve stavke u Recycle Bin i sadržaje povezane s njima. Jeste li sigurni da želite isprazniti Recycle Bin?',
    'recycle_bin_destroy_confirm' => 'This action will permanently delete this item from the system, along with any child elements listed below, and you will not be able to restore this content. Are you sure you want to permanently delete this item?',
    'recycle_bin_destroy_list' => 'Stavke koje treba izbrisati',
    'recycle_bin_restore_list' => 'Stavke koje treba vratiti',
    'recycle_bin_restore_confirm' => 'Ova radnja vraća izbrisane stavke i njene podređene elemente na prvobitnu lokaciju. Ako je nadređena stavka izbrisana i nju treba vratiti.',
    'recycle_bin_restore_deleted_parent' => 'S obzirom da je nadređena stavka obrisana najprije treba vratiti nju.',
    'recycle_bin_restore_parent' => 'Vrati Nadređenog',
    'recycle_bin_destroy_notification' => 'Ukupno izbrisane :count stavke iz Recycle Bin',
    'recycle_bin_restore_notification' => 'Ukupno vraćene :count stavke iz Recycle Bin',

    // Audit Log
    'audit' => 'Dnevnik revizije',
    'audit_desc' => 'Ovaj dnevnik revizije prikazuje popis aktivnosti zabilježene u sustavu. Ovaj popis nije definiran budući da nisu postavljeni filteri.',
    'audit_event_filter' => 'Filter događaja',
    'audit_event_filter_no_filter' => 'Bez filtera',
    'audit_deleted_item' => 'Izbrisane stavke',
    'audit_deleted_item_name' => 'Ime: :name',
    'audit_table_user' => 'Korisnik',
    'audit_table_event' => 'Događaj',
    'audit_table_related' => 'Povezana stavka ili detalj',
    'audit_table_ip' => 'IP Adresa',
    'audit_table_date' => 'Datum aktivnosti',
    'audit_date_from' => 'Rangiraj datum od',
    'audit_date_to' => 'Rangiraj datum do',

    // Role Settings
    'roles' => 'Uloge',
    'role_user_roles' => 'Uloge korisnika',
    'roles_index_desc' => 'Uloge se koriste za grupiranje korisnika i dodjeljivanje sistemskih dozvola njihovim članovima. Kada je korisnik član više uloga, privilegije se zbrajaju i korisnik nasljeđuje sve sposobnosti svake uloge.',
    'roles_x_users_assigned' => ':count korisnik dodijeljen|:count korisnika dodijeljeno',
    'roles_x_permissions_provided' => ':count dozvola|:count dozvole',
    'roles_assigned_users' => 'Odredi Korisnika',
    'roles_permissions_provided' => 'Dostavljene Dozvole',
    'role_create' => 'Stvori novu ulogu',
    'role_delete' => 'Izbriši ulogu',
    'role_delete_confirm' => 'Ovo će izbrisati ulogu povezanu s imenom \':roleName\'.',
    'role_delete_users_assigned' => 'Ova uloga dodijeljena je :userCount. Ako želite premjestiti korisnike iz ove uloge odaberite novu ulogu u nastavku.',
    'role_delete_no_migration' => "Ne migriraj korisnike",
    'role_delete_sure' => 'Jeste li sigurni da želite obrisati ovu ulogu?',
    'role_edit' => 'Uredi ulogu',
    'role_details' => 'Detalji uloge',
    'role_name' => 'Ime uloge',
    'role_desc' => 'Kratki opis uloge',
    'role_mfa_enforced' => 'Zahtijeva višestruku provjeru autentičnosti',
    'role_external_auth_id' => 'Autorizacija',
    'role_system' => 'Dopuštenja sustava',
    'role_manage_users' => 'Upravljanje korisnicima',
    'role_manage_roles' => 'Upravljanje ulogama i dopuštenjima',
    'role_manage_entity_permissions' => 'Upravljanje dopuštenjima nad knjigama, poglavljima i stranicama',
    'role_manage_own_entity_permissions' => 'Upravljanje dopuštenjima vlastitih knjiga, poglavlja i stranica',
    'role_manage_page_templates' => 'Upravljanje predlošcima stranica',
    'role_access_api' => 'API pristup',
    'role_manage_settings' => 'Upravljanje postavkama aplikacija',
    'role_export_content' => 'Izvoz sadržaja',
    'role_editor_change' => 'Promijeni uređivač stranica',
    'role_notifications' => 'Primanje i upravljanje obavijestima',
    'role_asset' => 'Upravljanje vlasništvom',
    'roles_system_warning' => 'Uzmite u obzir da pristup bilo kojem od ovih dopuštenja dozvoljavate korisniku upravljanje dopuštenjima ostalih u sustavu. Ova dopuštenja dodijelite pouzdanim korisnicima.',
    'role_asset_desc' => 'Ova dopuštenja kontroliraju zadane pristupe. Dopuštenja za knjige, poglavlja i stranice ih poništavaju.',
    'role_asset_admins' => 'Administratori automatski imaju pristup svim sadržajima, ali ove opcije mogu prikazati ili sakriti korisnička sučelja.',
    'role_asset_image_view_note' => 'Ovo se odnosi na vidljivost unutar upravitelja slika. Stvarni pristup uploadiranim slikovnim datotekama ovisit će o odabranim opcijama pohrane slika u sustavu.',
    'role_all' => 'Sve',
    'role_own' => 'Vlastito',
    'role_controlled_by_asset' => 'Kontrolirano od strane vlasnika',
    'role_save' => 'Spremi ulogu',
    'role_users' => 'Korisnici u ovoj ulozi',
    'role_users_none' => 'Trenutno nijedan korisnik nije u ovoj ulozi',

    // Users
    'users' => 'Korisnici',
    'users_index_desc' => 'Kreirajte i upravljajte pojedinačnim korisničkim računima unutar sustava. Korisnički računi koriste se za prijavu i pripisivanje sadržaja i aktivnosti. Dozvole pristupa temelje se uglavnom na ulogama, ali vlasništvo korisničkog sadržaja, među ostalim faktorima, također može utjecati na dozvole i pristup.',
    'user_profile' => 'Profil korisnika',
    'users_add_new' => 'Dodajte novog korisnika',
    'users_search' => 'Pretražite korisnike',
    'users_latest_activity' => 'Zadnje aktivnosti',
    'users_details' => 'Detalji korisnika',
    'users_details_desc' => 'Postavite prikaz imena i email adrese za ovog korisnika. Email adresa koristit će se za prijavu u aplikaciju.',
    'users_details_desc_no_email' => 'Postavite prikaz imena ovog korisnika da ga drugi mogu prepoznati.',
    'users_role' => 'Uloge korisnika',
    'users_role_desc' => 'Odaberite koje će uloge biti dodijeljene ovom korisniku. Ako korisnik ima više uloga njihova će se dopuštenja prilagoditi.',
    'users_password' => 'Lozinka korisnika',
    'users_password_desc' => 'Postavite lozinku koja se koristi za prijavu u aplikaciju. Lozinka mora imati najmanje 8 znakova.',
    'users_send_invite_text' => 'Možete odabrati slanje e maila korisniku i dozvoliti mu da postavi svoju lozinku ili vi to možete učiniti za njega.',
    'users_send_invite_option' => 'Pošaljite pozivnicu korisniku putem emaila',
    'users_external_auth_id' => 'Vanjska autorizacija',
    'users_external_auth_id_desc' => 'When an external authentication system is in use (such as SAML2, OIDC or LDAP) this is the ID which links this BookStack user to the authentication system account. You can ignore this field if using the default email-based authentication.',
    'users_password_warning' => 'Only fill the below if you would like to change the password for this user.',
    'users_system_public' => 'Ovaj korisnik predstavlja bilo kojeg gosta. Dodjeljuje se automatski.',
    'users_delete' => 'Izbrišite korisnika',
    'users_delete_named' => 'Izbrišite korisnika :userName',
    'users_delete_warning' => 'Ovo će ukloniti korisnika \':userName\' iz sustava.',
    'users_delete_confirm' => 'Jeste li sigurni da želite izbrisati ovog korisnika?',
    'users_migrate_ownership' => 'Premjestite vlasništvo',
    'users_migrate_ownership_desc' => 'Ovdje odaberite korisnika kojem ćete dodijeliti vlasništvo i sve stavke povezane s njim.',
    'users_none_selected' => 'Nije odabran nijedan korisnik',
    'users_edit' => 'Uredite korisnika',
    'users_edit_profile' => 'Uredite profil',
    'users_avatar' => 'Korisnički avatar',
    'users_avatar_desc' => 'Odaberite sliku koja će predstavljati korisnika. Maksimalno 256px.',
    'users_preferred_language' => 'Prioritetni jezik',
    'users_preferred_language_desc' => 'Ova će opcija promijeniti jezik korisničkog sučelja. Neće utjecati na sadržaj.',
    'users_social_accounts' => 'Računi društvenih mreža',
    'users_social_accounts_desc' => 'View the status of the connected social accounts for this user. Social accounts can be used in addition to the primary authentication system for system access.',
    'users_social_accounts_info' => 'Ovdje možete povezati račun s onim na društvenim mrežama za bržu i lakšu prijavu. Ako se odspojite ovdje to neće utjecati na prethodnu autorizaciju. Na postavkama računa vaše društvene mreže možete opozvati pristup.',
    'users_social_connect' => 'Poveži račun',
    'users_social_disconnect' => 'Odvoji račun',
    'users_social_status_connected' => 'Connected',
    'users_social_status_disconnected' => 'Disconnected',
    'users_social_connected' => ':socialAccount račun je uspješno dodan vašem profilu.',
    'users_social_disconnected' => ':socialAccount račun je uspješno odvojen od vašeg profila.',
    'users_api_tokens' => 'API tokeni',
    'users_api_tokens_desc' => 'Create and manage the access tokens used to authenticate with the BookStack REST API. Permissions for the API are managed via the user that the token belongs to.',
    'users_api_tokens_none' => 'Nijedan API token nije stvoren za ovog korisnika',
    'users_api_tokens_create' => 'Stvori token',
    'users_api_tokens_expires' => 'Isteklo',
    'users_api_tokens_docs' => 'API dokumentacija',
    'users_mfa' => 'Višefaktorska Provjera Vjerodostojnosti',
    'users_mfa_desc' => 'Postavite višestruku provjeru autentičnosti kao dodatni sloj sigurnosti za svoj korisnički račun.',
    'users_mfa_x_methods' => ':count metoda konfigurirano|:count metode konfigurirane',
    'users_mfa_configure' => 'Konfiguriraj Metode',

    // API Tokens
    'user_api_token_create' => 'Stvori API token',
    'user_api_token_name' => 'Ime',
    'user_api_token_name_desc' => 'Imenujte svoj token na način da prepoznate njegovu svrhu.',
    'user_api_token_expiry' => 'Datum isteka',
    'user_api_token_expiry_desc' => 'Postavite datum kada token istječe. Ostavljanjem ovog polja praznim automatski se postavlja dugoročno razdoblje.',
    'user_api_token_create_secret_message' => 'Odmah nakon kreiranja tokena prikazat će se "Token ID" i "Token Secret". To će se prikazati samo jednom i zato preporučujemo da ga spremite na sigurno.',
    'user_api_token' => 'API token',
    'user_api_token_id' => 'ID Tokena',
    'user_api_token_id_desc' => 'Ovaj sistemski generiran identifikator ne može se uređivati i bit će potreban pri API zahtjevima.',
    'user_api_token_secret' => 'Token Tajna',
    'user_api_token_secret_desc' => 'Ovaj sistemski generirani Token Secret trebat ćete za API zahtjev. Prikazuje se samo prvi put i zato ga spremite na sigurno.',
    'user_api_token_created' => 'Token kreiran :timeAgo',
    'user_api_token_updated' => 'Token ažuriran :timeAgo',
    'user_api_token_delete' => 'Izbriši token',
    'user_api_token_delete_warning' => 'Ovo će potpuno izbrisati API token naziva \':tokenName\' iz našeg sustava.',
    'user_api_token_delete_confirm' => 'Jeste li sigurni da želite izbrisati ovaj API token?',

    // Webhooks
    'webhooks' => 'Web-dojavnici',
    'webhooks_index_desc' => 'Web-dojavnici su način slanja podataka na vanjske URL-ove kada se određene radnje i događaji dogode unutar sustava, omogućujući integraciju temeljenu na događajima s vanjskim platformama poput sustava za slanje poruka ili obavijesti.',
    'webhooks_x_trigger_events' => ':count događaj okidača|:count događaji okidača',
    'webhooks_create' => 'Kreiraj Novi Web-dojavnik',
    'webhooks_none_created' => 'Nijedan web-dojavnik nije još kreiran.',
    'webhooks_edit' => 'Uredi Web-dojavnik',
    'webhooks_save' => 'Spasi Web-dojavnik',
    'webhooks_details' => 'Detalji Web-dojavnika',
    'webhooks_details_desc' => 'Navedite korisnički prijateljsko ime i POST krajnju točku kao lokaciju na koju će se slati podaci web-dojavnika.',
    'webhooks_events' => 'Događaji Web-dojavnika',
    'webhooks_events_desc' => 'Odaberite sve događaje koji bi trebali pokrenuti poziv za ovaj web-dojavnik.',
    'webhooks_events_warning' => 'Imajte na umu da će se ovi događaji pokrenuti za sve odabrane događaje, čak i ako se primjenjuju prilagođene dozvole. Osigurajte se da upotreba ovog web-dojavnika neće otkriti povjerljiv sadržaj.',
    'webhooks_events_all' => 'Svi sistemski događaji',
    'webhooks_name' => 'Naziv Web-dojavnika',
    'webhooks_timeout' => 'Vremensko ograničenje zahtjeva web-dojavnika (u sek.)',
    'webhooks_endpoint' => 'Odredište Web-dojavnika',
    'webhooks_active' => 'Web-dojavnik Aktivan',
    'webhook_events_table_header' => 'Događaji',
    'webhooks_delete' => 'Izbriši Web-dojavnik',
    'webhooks_delete_warning' => 'Ovo će u potpunosti izbrisati web-dojavnik pod nazivom ":webhookName" iz sustava.',
    'webhooks_delete_confirm' => 'Jeste li sigurni da želite obrisati ovaj Web-dojavnik?',
    'webhooks_format_example' => 'Primjer formata web-dojavnika',
    'webhooks_format_example_desc' => 'Podaci web-dojavnika se šalju kao POST zahtjev na konfiguriranu krajnju točku kao JSON prema sljedećem formatu. Svojstva "related_item" i "url" su opcionalna i ovise o vrsti pokrenutog događaja.',
    'webhooks_status' => 'Status Web-dojavnika',
    'webhooks_last_called' => 'Zadnji Poziv:',
    'webhooks_last_errored' => 'Zadnja pogreška:',
    'webhooks_last_error_message' => 'Posljednja poruka o pogrešci:',

    // Licensing
    'licenses' => 'Licenses',
    'licenses_desc' => 'This page details license information for BookStack in addition to the projects & libraries that are used within BookStack. Many projects listed may only be used in a development context.',
    'licenses_bookstack' => 'BookStack License',
    'licenses_php' => 'PHP Library Licenses',
    'licenses_js' => 'JavaScript Library Licenses',
    'licenses_other' => 'Other Licenses',
    'license_details' => 'License Details',

    //! If editing translations files directly please ignore this in all
    //! languages apart from en. Content will be auto-copied from en.
    //!////////////////////////////////
    'language_select' => [
        'en' => 'English',
        'ar' => 'العربية',
        'bg' => 'Bǎlgarski',
        'bs' => 'Bosanski',
        'ca' => 'Català',
        'cs' => 'Česky',
        'cy' => 'Cymraeg',
        'da' => 'Dansk',
        'de' => 'Deutsch (Sie)',
        'de_informal' => 'Deutsch (Du)',
        'el' => 'ελληνικά',
        'es' => 'Español',
        'es_AR' => 'Español Argentina',
        'et' => 'Eesti keel',
        'eu' => 'Euskara',
        'fa' => 'فارسی',
        'fi' => 'Suomi',
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
        'nb' => 'Norsk (Bokmål)',
        'nn' => 'Nynorsk',
        'nl' => 'Nederlands',
        'pl' => 'Polski',
        'pt' => 'Português',
        'pt_BR' => 'Português do Brasil',
        'ro' => 'Română',
        'ru' => 'Русский',
        'sk' => 'Slovensky',
        'sl' => 'Slovenščina',
        'sv' => 'Svenska',
        'tr' => 'Türkçe',
        'uk' => 'Українська',
        'uz' => 'O‘zbekcha',
        'vi' => 'Tiếng Việt',
        'zh_CN' => '简体中文',
        'zh_TW' => '繁體中文',
    ],
    //!////////////////////////////////
];
