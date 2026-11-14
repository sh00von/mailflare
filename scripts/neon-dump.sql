-- Replyot Data Migration from Neon to Local Postgres

-- Data for users
INSERT INTO "users" ("id", "email", "reset_email", "forwarding_email", "password_hash", "name", "booking_username", "time_zone", "avatar_key", "role", "is_primary_admin", "disabled", "can_manage_mailboxes", "can_manage_domains", "can_manage_users", "keyboard_shortcuts_enabled", "spam_protection_enabled", "trash_retention_days", "show_full_recipient_addresses", "remote_content_mode", "totp_secret", "totp_enabled", "totp_confirmed_at", "last_sign_in_at", "deleted_at", "created_by_user_id", "created_at", "require_second_factor", "passkey_count", "security_version", "calendar_enabled", "drive_enabled", "workspace_id") VALUES ('usr_emQqKFflGMR8kAATb_YjF', 'hello@ordify.site', 'minar.svn@gmail.com', NULL, '$2b$12$XjizY.WCG5sz19m/YyBilOCMZSN3YGAxKkjax.o6BdfLJkup.POsi', 'hello', NULL, NULL, NULL, 'admin', true, false, true, true, true, true, true, NULL, false, 'ask', NULL, false, NULL, '1794648484', NULL, NULL, '1794645854', false, '0', '0', true, true, 'ws_gzhteDI8qDKifP5oEDZhB') ON CONFLICT DO NOTHING;

-- Data for workspaces
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_76i52uEZBWjoJ7Veu0MG8', 'hello''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794645854', '1794647560', 'cus_VcsJihWpmXhPHR', NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_a37eBxt_dYjhHippHu-v3', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794647924', '1794647924', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_JHGkm7R1Eo81MNFmxGwP4', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794648695', '1794648695', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_ixDi439kuBZ4oQRXlVRw2', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794649366', '1794649366', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_NWrcz6M3hBx6jkx776GrC', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794649414', '1794649414', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_STLF9w6RiOl5aGYn3iUVz', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794649478', '1794649478', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_U0Ad68IDCxJb7AQUjplOc', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794650137', '1794650137', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_zI9EE_qMkkl88FmY2r368', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794650184', '1794650184', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_lq19Y4tcyfxPeawCIAMhr', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794650650', '1794650650', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;
INSERT INTO "workspaces" ("id", "name", "owner_user_id", "plan", "status", "trial_ends_at", "created_at", "updated_at", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_end", "max_mailboxes", "billing_cycle") VALUES ('ws_gzhteDI8qDKifP5oEDZhB', '''s Workspace', 'usr_emQqKFflGMR8kAATb_YjF', 'starter', 'active', NULL, '1794651168', '1794651168', NULL, NULL, NULL, NULL, '5', '12m') ON CONFLICT DO NOTHING;

-- Data for domains
INSERT INTO "domains" ("id", "user_id", "hostname", "zone_id", "status", "routing_status", "sending_subdomain_tag", "sending_provider", "receiving_provider", "sending_requested", "sending_enabled", "routing_enabled", "dns_skipped", "created_at", "workspace_id", "dkim_private_key", "dkim_public_key", "dkim_selector") VALUES ('dom_L9Aqal5ztzdi4nX6zS_UM', 'usr_emQqKFflGMR8kAATb_YjF', 'ordify.site', 'self-hosted', 'active', 'active', NULL, 'postfix', 'none', true, true, true, false, '1794645855', 'ws_76i52uEZBWjoJ7Veu0MG8', '-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJQwdJ1sWcSMs4
Aap6YJFWWF05+cjghD+mv17G7ml7GviCULrhSbfmLwjnPKtcym4Kjg5v7eWAe0we
M76M9BKE0X58QxXX8FxDeAjjmdGEVIGc0MvcAHCvVpxeR7+PttHdwdpjVWlkE2pw
xDgiLN48nLLxjjguMaGoVdi0GfE30GORC3KHzc6RnaPzCf/QvrTCUq4B86oWZ89K
qjnw6VYIth5Z5T7RZ0cNl5Mca8eT1PNJLjskHFUHZqDniJysSYl3mBaKTo+swHZh
t12lIOqsrZ1Xu0x56PD4oprlpoI9G0P2z4Va3KqJe6/zAwASISK9ZOy0WbVgMawF
Bq3N0HOnAgMBAAECggEAGbqjbQ7zU/TsYdxjU7dnrRRT1WG3iphC3jQlz3moFhr5
vQh0CPFYfKlI/ULAx3aA1dbuRTnc9pgMlZSDiNfPoZd55jSEpNvvTO1vTtAZvE3k
r0xJW3aE8VgPBRstWUKDwX09nX2hoQUTEkJ2HfcCxtiOJG+hgqpJTSYDCOyDbWEm
W+tcffkZ/3l2DU2MqawQRNYGOXfhyqrRFlRlgLn0W42CsHMBN1uqe6UOrMYtkowp
xRxhO3RJ0/euedlh/N9lu14sM45Fcj1WsA+LyRXuJHwCHTAWRwSoZEvuhWzd7B8l
azqAtomqbEIHzCRtqjxrQSORSmxFaGucMNO0eN5vgQKBgQDsXQkNi+bpkPaoU6P8
a4X1V2u/pQKI4Y0IIHaqEkHjWnCcxJZnybpAaxXTxk57Kiwclm1kIt6ubHcA6I7F
/T392W4eSiLexPcIiaezIkppHEel/g03Mu0ffR196GzZz1uTudChwkvj7su78iSq
dRBAagxnTOC+BD8Y/6+e1gStgQKBgQDZ+3RRlMYdRgJ5zI/J9uYYusff4939Jjr9
ZYaPrXStYLsBZ1dgDPXkAC3NJxVrec5Z68+x1snLsSEZ8Uf5au4SQMYM/vx3n52v
k8hanURbU4l/12Ew5Cia+k+PVnTEbusBPrl1UxnereczejaUb5oLHZQUy/+j4rUa
a3cXi/aFJwKBgFNx8P1AU/BHhl0c0jsONsfL6jVJayCqCGFDHMGkGnDKgBFIchUI
KeIOLDGMxC5FUDdzgAEnMlh/4G+IqscJRbZ16aN15uOgw9nWx0a9p2l+W2klzMKd
Dwvb3uqRgMRQqXL42cgR0TsSFgkvTnSDSY6EIgbiJEHRO/l2Yyj/Q72BAoGBAMmr
y7UCmLxSnk3DhTCMnds5S1yHfEUOjrsLqA/bobwaZ0loK71woDn+NGG+jCGwQsqM
0c4t8uriCMbwpO9MD9CRXup9KmUeJoxfhJjZMXnw8qB1SrUqEas4dE0f5s4p9IBl
YL38UU3kxKeqpT51diZcijknd29PetBjpn4BfuU3AoGBAMmT+McC/Oo8M3KNgKaC
TtDP1aP1vD4AQenDCmkrx1XoxDqMpPab1+V4/2LoIJ+AzBvw4eYXdwE6JAN7Oy9l
S4CooZFZG5mwVEDmKfdYdd7UIO3kYmVS1CrkakEs+cphTqlfWXmU2zMnu4g0MLXN
RhgFdRSofSuMzxnKgEBOVLx4
-----END PRIVATE KEY-----
', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyUMHSdbFnEjLOAGqemCRVlhdOfnI4IQ/pr9exu5pexr4glC64Um35i8I5zyrXMpuCo4Ob+3lgHtMHjO+jPQShNF+fEMV1/BcQ3gI45nRhFSBnNDL3ABwr1acXke/j7bR3cHaY1VpZBNqcMQ4IizePJyy8Y44LjGhqFXYtBnxN9BjkQtyh83OkZ2j8wn/0L60wlKuAfOqFmfPSqo58OlWCLYeWeU+0WdHDZeTHGvHk9TzSS47JBxVB2ag54icrEmJd5gWik6PrMB2YbddpSDqrK2dV7tMeejw+KKa5aaCPRtD9s+FWtyqiXuv8wMAEiEivWTstFm1YDGsBQatzdBzpwIDAQAB', 'default') ON CONFLICT DO NOTHING;

-- Data for mailboxes
INSERT INTO "mailboxes" ("id", "user_id", "domain_id", "local_part", "display_name", "signature", "auto_reply_enabled", "auto_reply_subject", "auto_reply_body", "avatar_key", "type", "use_all_domains", "disabled", "created_at") VALUES ('mbx_UOPKAoBnIH8ojsxdVNNZd', 'usr_emQqKFflGMR8kAATb_YjF', 'dom_L9Aqal5ztzdi4nX6zS_UM', 'hello', 'hello', NULL, false, 'Out of office', '', NULL, 'personal', true, false, '1794645856') ON CONFLICT DO NOTHING;

-- Data for app_settings
INSERT INTO "app_settings" ("id", "app_name", "outbound_attachment_max_mb", "drive_storage_limit_bytes", "resend_api_key", "aws_config", "ses_receiving", "resend_webhook_id", "resend_webhook_secret", "icon_key", "agent_enabled", "agent_provider", "agent_preset", "agent_base_url", "agent_api_key", "agent_model", "agent_model_rates", "spamhaus_dqs_key", "abusech_auth_key", "spam_domain_age_check", "spam_brands", "updated_at") VALUES ('default', 'Mailflare', '25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, '1794644949') ON CONFLICT DO NOTHING;

-- Data for backup_settings
INSERT INTO "backup_settings" ("id", "enabled", "schedule_type", "schedule_value", "retention_enabled", "retention_days", "excluded_table_groups", "updated_at") VALUES ('default', false, 'daily', NULL, false, '30', '[]', '1794644949') ON CONFLICT DO NOTHING;

-- Data for contacts
INSERT INTO "contacts" ("id", "user_id", "email", "display_name", "avatar_key", "source", "blocked", "remote_content_allowed", "last_seen_at", "created_at") VALUES ('usr_emQqKFflGMR8kAATb_YjF:mailer-daemon@23c52ee5403d', 'usr_emQqKFflGMR8kAATb_YjF', 'mailer-daemon@23c52ee5403d', 'Mail Delivery System', NULL, 'inbound', false, false, '1794650682', '1794650682') ON CONFLICT DO NOTHING;
INSERT INTO "contacts" ("id", "user_id", "email", "display_name", "avatar_key", "source", "blocked", "remote_content_allowed", "last_seen_at", "created_at") VALUES ('usr_emQqKFflGMR8kAATb_YjF:minar.svn@gmail.com', 'usr_emQqKFflGMR8kAATb_YjF', 'minar.svn@gmail.com', 'Minaruzzaman Shovon', 'contact-avatars/usr_emQqKFflGMR8kAATb_YjF/minar.svn%40gmail.com', 'outbound', false, false, '1794651171', '1794647928') ON CONFLICT DO NOTHING;

-- Data for messages
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_BV1EPVePg-dn1xPXAo_Q3', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'test', 'test', 'test', 'test', NULL, 'draft', true, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794647909', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_8YnB1cXwv0uArpqupUlOH', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'test', 'test', 'test', 'test', NULL, 'failed', true, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794647933', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_7ee7ac73ac53a1828cff829139ab357ed6b688672495f22fc04a28f756cd5c2a', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'inbound', '<CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com>', NULL, '"Minaruzzaman Shovon" <minar.svn@gmail.com>', '"hello" <hello@ordify.site>', NULL, NULL, NULL, 'test', 'test -- Md. Minaruzzaman Shovon Portfolio <https://shovon.bd/> | LinkedIn <https://www.linkedin.com/in/minarsvn9090/> | GitHub <https://github.com/sh00von> | Email <minar.svn@gmail.com>', 'test
-- 
Md. Minaruzzaman Shovon
Portfolio <https://shovon.bd/> | LinkedIn
<https://www.linkedin.com/in/minarsvn9090/> | GitHub
<https://github.com/sh00von> | Email <minar.svn@gmail.com>

', '<div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://www.linkedin.com/in/minarsvn9090/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://github.com/sh00von" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="mailto:minar.svn@gmail.com" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>

', 'inbound/43ab277f991e368fafddcd5e2a6c359987f023d2f8630ef970fa1ef5c6d087b3.eml', 'received', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', NULL, NULL, '0', 'inbox', '[{"id":"dmarc_passed","score":-8,"reason":"DMARC authentication passed"},{"id":"dkim_passed","score":-4,"reason":"DKIM authentication passed"},{"id":"spf_passed","score":-2,"reason":"SPF authentication passed"},{"id":"previously_sent","score":-25,"reason":"You have previously sent email to this address"},{"id":"score_boundary","score":39,"reason":"Score cannot be lower than 0"}]', '1794648546', NULL, NULL, '1794648546', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_5ce369ffddd68e01431a1f57712e9d066a4fe01f355a216747f6607599246618', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'inbound', '<CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com>', NULL, '"Minaruzzaman Shovon" <minar.svn@gmail.com>', '"hello" <hello@ordify.site>', NULL, NULL, NULL, 'Re: test', 'yield line analysis On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:', 'yield line analysis

On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com>
wrote:

>
> test
> --
> Md. Minaruzzaman Shovon
> Portfolio <https://shovon.bd/> | LinkedIn
> <https://www.linkedin.com/in/minarsvn9090/> | GitHub
> <https://github.com/sh00von> | Email <minar.svn@gmail.com>
>


-- 
Md. Minaruzzaman Shovon
Portfolio <https://shovon.bd/> | LinkedIn
<https://www.linkedin.com/in/minarsvn9090/> | GitHub
<https://github.com/sh00von> | Email <minar.svn@gmail.com>

', '<div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div dir="ltr" class="gmail_attr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature"><div dir="ltr"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://www.linkedin.com/in/minarsvn9090/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://github.com/sh00von" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="mailto:minar.svn@gmail.com" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature"><div dir="ltr"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://www.linkedin.com/in/minarsvn9090/" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="https://github.com/sh00von" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a> <span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span> <a href="mailto:minar.svn@gmail.com" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

', 'inbound/3197e1335bd25784f42513eb2992e4885ede49b6a0a691103dbf743802a5435b.eml', 'received', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', '0', 'inbox', '[{"id":"dmarc_passed","score":-8,"reason":"DMARC authentication passed"},{"id":"dkim_passed","score":-4,"reason":"DKIM authentication passed"},{"id":"spf_passed","score":-2,"reason":"SPF authentication passed"},{"id":"previously_sent","score":-25,"reason":"You have previously sent email to this address"},{"id":"score_boundary","score":39,"reason":"Score cannot be lower than 0"}]', '1794648606', NULL, NULL, '1794648606', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_iNBAGIeShFo6tKQse-WyX', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', 'torsion analsyis nh', 'torsion analsyis nh

On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', 'torsion analsyis nh<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'draft', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '1794648661', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_vIaxxcPA_4eVUyckfxYqv', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', 'torsion analsyis', 'torsion analsyis

On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', 'torsion analsyis<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'trash', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, '1794648872', '1794648698', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_tJa_YazX4QbIg-z2lECQg', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', 'torsion analsyis', 'torsion analsyis

On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', 'torsion analsyis<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'failed', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '1794649370', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_jQqzdu6dSIND_RuuFn1Bz', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', 'torsion analsyis', 'torsion analsyis

On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', 'torsion analsyis<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'failed', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '1794649418', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_miiKuY_vb2WPF1N8vbYAU', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', 'torsion analsyis nh', 'torsion analsyis nh

On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', 'torsion analsyis nh<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'failed', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '1794649482', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_j83k0xBZE1QseRbIcPnoL', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', '"Minaruzzaman Shovon" <minar.svn@gmail.com>', NULL, NULL, NULL, 'Re: test', '', 'On Sat, Nov 14, 2026, 3:30 PM, "Minaruzzaman Shovon" <minar.svn@gmail.com> wrote:

> yield line analysis
>
>
>
> On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon <minar.svn@gmail.com> wrote:
>
>
> > test
> > --
> >
> >
> >
> >
> >
> > Md. Minaruzzaman Shovon
> >
> > Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email
>
>
>
>
>
>
>
> --
>
>
>
>
>
> Md. Minaruzzaman Shovon
>
> Portfolio (https://shovon.bd/) | LinkedIn (https://www.linkedin.com/in/minarsvn9090/) | GitHub (https://github.com/sh00von) | Email', '<div class="replyot-quote" data-replyot-quote="1"><div style="margin-top:1.4em">On Sat, Nov 14, 2026, 3:30 PM, &quot;Minaruzzaman Shovon&quot; &lt;minar.svn@gmail.com&gt; wrote:</div><blockquote style="margin:0 0 0 0;border-left:1px solid #ccc;padding-left:1ex;opacity:0.6"><div dir="ltr">yield line analysis</div><br><div class="gmail_quote gmail_quote_container"><div class="gmail_attr" dir="ltr">On Sat, Nov 14, 2026 at 3:28 PM Minaruzzaman Shovon &lt;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" target="_blank">minar.svn@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr"><div><br clear="all"></div><div>test</div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div></div>
</blockquote></div><div><br clear="all"></div><div><br></div><span class="gmail_signature_prefix">-- </span><br><div class="gmail_signature" dir="ltr"><div dir="ltr"><table border="0" cellpadding="0" cellspacing="0" style="color:rgb(0,0,0);font-size:medium;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;padding:40px 0px;border-top:2px solid rgb(248,249,250)" width="100%"><tbody><tr><td align="center"><div style="margin-bottom:12px"><span style="color:rgb(17,24,39);font-weight:700;font-size:15px;letter-spacing:0.3px">Md. Minaruzzaman Shovon</span></div><div style="font-size:13px"><a href="https://shovon.bd/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Portfolio</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://www.linkedin.com/in/minarsvn9090/" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">LinkedIn</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="https://github.com/sh00von" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">GitHub</a>&nbsp;<span style="color:rgb(209,213,219);display:inline-block;vertical-align:middle">|</span>&nbsp;<a href="mailto:minar.svn@gmail.com" rel="noopener noreferrer" style="color:rgb(75,85,99);text-decoration:none;padding:6px 10px;display:inline-block" target="_blank">Email</a></div></td></tr></tbody></table></div></div>

</blockquote></div>', NULL, 'draft', true, false, NULL, 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com', 'CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', 'CAOtunF_xcTLVAeGQ-QTmu1LEHZMeo1WA+de=eOgeJkkKAK8KTg@mail.gmail.com CAOtunF95oZNM3OH37A7gk4HuRpx_77gnoBCYrB39SRetaUZPqg@mail.gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, '1794650088', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_m6v0Cw6cMD7HXv_hm1_LM', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'ettete', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', NULL, 'draft', true, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794650110', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_iuSW8AOJEtYYFXaUDjMJ0', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'ettete', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', NULL, 'failed', true, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794650141', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_VnANPmlrACX3kVYItrul5', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', NULL, NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'ettete', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', 'hdhdkskdshhk dsds', NULL, 'failed', true, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794650188', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_OvtFb6nOxwDN5US3jZeCN', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', '<505cb11a-f9f0-4a68-b558-7adad9dd16cd@ordify.site>', NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'test', 'teststt', 'teststt', 'teststt', NULL, 'sent', true, false, NULL, '505cb11a-f9f0-4a68-b558-7adad9dd16cd@ordify.site', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794650655', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_236c08129633201cfd298e635010a1325b67efe846b16739fd6f4c031ce1fae7', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'inbound', '<20261114100432.7BD7BC41FF@23c52ee5403d>', NULL, '"Mail Delivery System" <MAILER-DAEMON@23c52ee5403d>', 'hello@ordify.site', NULL, NULL, NULL, 'Undelivered Mail Returned to Sender', 'This is the mail system at host 23c52ee5403d. I''m sorry to have to inform you that your message could not be delivered to one or more recipients. It''s attached below. For further assistance, please se', 'This is the mail system at host 23c52ee5403d.

I''m sorry to have to inform you that your message could not
be delivered to one or more recipients. It''s attached below.

For further assistance, please send mail to postmaster.

If you do so, please include this problem report. You can
delete your own text from the attached returned message.

                   The mail system

<minar.svn@gmail.com>: host gmail-smtp-in.l.google.com[192.178.158.27] said:
    550-5.7.26 Your email has been blocked because the sender is
    unauthenticated. 550-5.7.26 Gmail requires all senders to authenticate with
    either SPF or DKIM. 550-5.7.26  550-5.7.26  Authentication results:
    550-5.7.26  DKIM = did not pass 550-5.7.26  SPF [ordify.site] with ip:
    [103.42.4.218] = did not pass 550-5.7.26  550-5.7.26  For instructions on
    setting up authentication, go to 550 5.7.26
    https://support.google.com/mail/answer/81126#authentication
    d9443c01a7336-2ee0f8e4230si121925225ad.102 - gsmtp (in reply to end of DATA
    command)

', NULL, 'inbound/66b9a10b630a3a5c8deaa09b3b97d020244c2305b933eaa6fdc191f2268d53c0.eml', 'received', true, false, NULL, '20261114100432.7BD7BC41FF@23c52ee5403d', NULL, NULL, '0', 'inbox', '[]', '1794650684', NULL, NULL, '1794650684', false) ON CONFLICT DO NOTHING;
INSERT INTO "messages" ("id", "user_id", "mailbox_id", "direction", "provider_message_id", "folder_id", "from_addr", "to_addr", "cc_addr", "bcc_addr", "reply_to", "subject", "snippet", "text_body", "html_body", "raw_r2_key", "status", "read", "starred", "snoozed_until", "thread_id", "in_reply_to", "references_header", "spam_score", "spam_verdict", "spam_signals", "spam_analyzed_at", "spam_analysis_error", "trashed_at", "created_at", "has_unsubscribe") VALUES ('msg_NEVOK4K_HZ1lsvmklDzjX', 'usr_emQqKFflGMR8kAATb_YjF', 'mbx_UOPKAoBnIH8ojsxdVNNZd', 'outbound', '<d96e9921-f3d1-42ff-a935-ce6be582e470@ordify.site>', NULL, '"hello" <hello@ordify.site>', 'minar.svn@gmail.com', NULL, NULL, NULL, 'test', 'test', 'test', 'test', NULL, 'sent', true, false, NULL, 'd96e9921-f3d1-42ff-a935-ce6be582e470@ordify.site', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1794651171', false) ON CONFLICT DO NOTHING;

-- Data for message_attachments
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_fD0WPl-5L9rrY8Q437a8y', 'msg_5ce369ffddd68e01431a1f57712e9d066a4fe01f355a216747f6607599246618', 'Yield Line.pdf', 'application/pdf', '3395585', 'attachment', '<f_mwg7f2hb0>', 'attachments/msg_5ce369ffddd68e01431a1f57712e9d066a4fe01f355a216747f6607599246618/att_fD0WPl-5L9rrY8Q437a8y/Yield Line.pdf', NULL, '1794648610') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_5CCpNCW9RsfE07EuZIg3I', 'msg_iNBAGIeShFo6tKQse-WyX', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_iNBAGIeShFo6tKQse-WyX/att_5CCpNCW9RsfE07EuZIg3I/Torsion.pdf', NULL, '1794648681') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_VdVXBeZcvNkJU9fZFotR2', 'msg_vIaxxcPA_4eVUyckfxYqv', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_vIaxxcPA_4eVUyckfxYqv/att_VdVXBeZcvNkJU9fZFotR2/Torsion.pdf', NULL, '1794648701') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_L1vm1OqYn3raWHl9MIuKf', 'msg_tJa_YazX4QbIg-z2lECQg', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_tJa_YazX4QbIg-z2lECQg/att_L1vm1OqYn3raWHl9MIuKf/Torsion.pdf', NULL, '1794649372') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_M5cfNEWh4mAV7mcdJt3Du', 'msg_jQqzdu6dSIND_RuuFn1Bz', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_jQqzdu6dSIND_RuuFn1Bz/att_M5cfNEWh4mAV7mcdJt3Du/Torsion.pdf', NULL, '1794649421') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_0Rm71BmDH4CX7GiN-lANj', 'msg_miiKuY_vb2WPF1N8vbYAU', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_miiKuY_vb2WPF1N8vbYAU/att_0Rm71BmDH4CX7GiN-lANj/Torsion.pdf', NULL, '1794649485') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_f-D-6FrFf5PWH0iY9Xf91', 'msg_m6v0Cw6cMD7HXv_hm1_LM', 'Flat Plate Slab.pdf', 'application/pdf', '2242663', 'attachment', NULL, 'attachments/msg_m6v0Cw6cMD7HXv_hm1_LM/att_f-D-6FrFf5PWH0iY9Xf91/Flat Plate Slab.pdf', NULL, '1794650127') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_z5rpXHwv6iHvRCjIzYgBK', 'msg_iuSW8AOJEtYYFXaUDjMJ0', 'Flat Plate Slab.pdf', 'application/pdf', '2242663', 'attachment', NULL, 'attachments/msg_iuSW8AOJEtYYFXaUDjMJ0/att_z5rpXHwv6iHvRCjIzYgBK/Flat Plate Slab.pdf', NULL, '1794650144') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_ns5z-0jL7hwADVn--91sG', 'msg_VnANPmlrACX3kVYItrul5', 'Flat Plate Slab.pdf', 'application/pdf', '2242663', 'attachment', NULL, 'attachments/msg_VnANPmlrACX3kVYItrul5/att_ns5z-0jL7hwADVn--91sG/Flat Plate Slab.pdf', NULL, '1794650192') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_Bdi3IQK92Ns70zm_MoPwB', 'msg_HfViBWWiAJlkvxQBaAvK3', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_HfViBWWiAJlkvxQBaAvK3/att_Bdi3IQK92Ns70zm_MoPwB/Torsion.pdf', NULL, '1794650642') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_Shtc05b-CRPr9c2VAFiap', 'msg_OvtFb6nOxwDN5US3jZeCN', 'Torsion.pdf', 'application/pdf', '1026071', 'attachment', NULL, 'attachments/msg_OvtFb6nOxwDN5US3jZeCN/att_Shtc05b-CRPr9c2VAFiap/Torsion.pdf', NULL, '1794650659') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_knXn1XQ8-Nyko4eIgYYbA', 'msg_236c08129633201cfd298e635010a1325b67efe846b16739fd6f4c031ce1fae7', 'attachment-1', 'message/delivery-status', '882', 'attachment', NULL, 'attachments/msg_236c08129633201cfd298e635010a1325b67efe846b16739fd6f4c031ce1fae7/att_knXn1XQ8-Nyko4eIgYYbA/attachment-1', NULL, '1794650684') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_b294jhKNxrSx7b6BOVLmW', 'msg_236c08129633201cfd298e635010a1325b67efe846b16739fd6f4c031ce1fae7', 'attachment-2', 'text/rfc822-headers', '1088', 'attachment', NULL, 'attachments/msg_236c08129633201cfd298e635010a1325b67efe846b16739fd6f4c031ce1fae7/att_b294jhKNxrSx7b6BOVLmW/attachment-2', NULL, '1794650685') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_aCW0_zVjhp0E0dfCLaJ-g', 'msg_MbpLH-FgxWie1cylHpNWN', 'Column.pdf', 'application/pdf', '1301460', 'attachment', NULL, 'attachments/msg_MbpLH-FgxWie1cylHpNWN/att_aCW0_zVjhp0E0dfCLaJ-g/Column.pdf', NULL, '1794651159') ON CONFLICT DO NOTHING;
INSERT INTO "message_attachments" ("id", "message_id", "filename", "content_type", "size", "disposition", "content_id", "r2_key", "trashed_at", "created_at") VALUES ('att_T67Te71YllIxvJIFBq0qM', 'msg_NEVOK4K_HZ1lsvmklDzjX', 'Column.pdf', 'application/pdf', '1301460', 'attachment', NULL, 'attachments/msg_NEVOK4K_HZ1lsvmklDzjX/att_T67Te71YllIxvJIFBq0qM/Column.pdf', NULL, '1794651174') ON CONFLICT DO NOTHING;

