-- Registro del consumo AI: una riga per ogni chiamata al provider.
--
-- Serve a rispondere a una domanda che oggi non ha risposta: quanto costa
-- ciascun accesso, e c'e' qualcuno che sta usando il Companion per farsi fare
-- i compiti invece che per provarlo. Fino a qui il conteggio arrivava dal
-- provider, veniva mostrato a schermo e buttato via.
--
-- Non limita niente e non blocca nessuno: misura soltanto. La decisione su cosa
-- fare di un consumo anomalo resta a una persona.
--
-- Nessun contenuto: qui ci sono numeri, un provider, un modello e due id.
-- Il testo delle conversazioni resta cifrato in companion_messaggi e non passa
-- mai di qua.

CREATE TABLE `companion_consumo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  -- A chi va imputato il consumo. Nessuna chiave esterna verso `utenti`: il
  -- registro deve sopravvivere alla cancellazione di un accesso, altrimenti
  -- basterebbe revocare un codice per far sparire le tracce del suo consumo.
  `utente_id` bigint NOT NULL,
  -- La sessione a cui apparteneva la richiesta, quando la conosciamo.
  `sessione_id` bigint DEFAULT NULL,
  `creato_il` datetime(6) NOT NULL,
  `provider` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modello` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_input` int NOT NULL DEFAULT 0,
  `token_output` int NOT NULL DEFAULT 0,
  -- Valorizzato solo quando la richiesta e' stata servita dal provider di
  -- ripiego: cosi' un guasto invisibile a chi scrive resta visibile a noi.
  `ripiego_da` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- Le due interrogazioni previste: "quanto ha consumato questo accesso" e
  -- "quanto si e' speso in questo periodo".
  KEY `idx_consumo_utente` (`utente_id`),
  KEY `idx_consumo_data` (`creato_il`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
