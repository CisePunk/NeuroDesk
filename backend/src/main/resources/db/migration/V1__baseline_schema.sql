-- Baseline dello schema, fotografia fedele della produzione al 28 luglio 2026.
--
-- Fino a qui lo schema lo creava Hibernate con ddl-auto=update: comodo per
-- partire, pericoloso con dati veri dentro (una rinomina di campo diventa una
-- colonna nuova + i dati vecchi orfani, senza che nessuno se ne accorga).
-- Da adesso lo schema lo governano queste migrazioni e Hibernate si limita a
-- verificare che il codice corrisponda (ddl-auto=validate).
--
-- Su un database che ESISTE GIA' questo file NON viene eseguito: Flyway lo
-- registra come baseline (spring.flyway.baseline-on-migrate) e riparte da V2.
-- Viene eseguito solo su un database vuoto: sviluppo, test, un server nuovo.
--
-- I nomi dei vincoli (FKamn2yslki..., UK8gs14ypv...) sono quelli generati da
-- Hibernate e sono tenuti IDENTICI alla produzione di proposito: questa e' una
-- fotografia, non una riscrittura. Le migrazioni successive useranno nomi leggibili.
--
-- Ordine di creazione: prima le tabelle senza dipendenze, poi quelle che le
-- referenziano, altrimenti le chiavi esterne non trovano il bersaglio.

CREATE TABLE `utenti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attivo` bit(1) NOT NULL,
  `consenso_il` datetime(6) DEFAULT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `etichetta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruolo` enum('SCUOLA','STUDENTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKiwudn0ago9taqnl9f6rp73sbr` (`login_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `moduli` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `carico_cognitivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `descrizione` text COLLATE utf8mb4_unicode_ci,
  `difficolta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stato` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tecnologia` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titolo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `studenti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attivo` bit(1) NOT NULL,
  `cognome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `livello_energia_preferito` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `utente_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK8gs14ypv5estf6biayppbejap` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contatto` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `consenso` bit(1) NOT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messaggio` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stato` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- utente_id qui non ha una chiave esterna verso `utenti`: e' voluto, il codice
-- lo tratta come riferimento debole. Lo lascio com'e' per non cambiare lo schema
-- mentre lo si mette sotto controllo (una cosa alla volta).
CREATE TABLE `companion_sessioni` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `aggiornato_il` datetime(6) DEFAULT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `titolo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utente_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `companion_messaggi` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenuto_cifrato` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `ruolo` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessione_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKamn2yslkixmsyhvskcsh44w4j` (`sessione_id`),
  CONSTRAINT `FKamn2yslkixmsyhvskcsh44w4j` FOREIGN KEY (`sessione_id`) REFERENCES `companion_sessioni` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `feedback` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `commento` text COLLATE utf8mb4_unicode_ci,
  `creato_il` datetime(6) DEFAULT NULL,
  `descrizione_errori` text COLLATE utf8mb4_unicode_ci,
  `utente_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `feedback_risposte` (
  `feedback_id` bigint NOT NULL,
  `valore` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domanda` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`feedback_id`,`domanda`),
  CONSTRAINT `FKo2ka9iv8k6m3hjrj2i3sx8ukf` FOREIGN KEY (`feedback_id`) REFERENCES `feedback` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_studio` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `aggiornato_il` datetime(6) DEFAULT NULL,
  `creato_il` datetime(6) DEFAULT NULL,
  `descrizione` text COLLATE utf8mb4_unicode_ci,
  `durata_stimata_minuti` int DEFAULT NULL,
  `finestra_energia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priorita` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stato` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_focus` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titolo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo_id` bigint NOT NULL,
  `studente_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKavav8ra57yjo4ncc8f4fsjawd` (`modulo_id`),
  KEY `FKk8ios3mukrdgghsb3lgpcw1tt` (`studente_id`),
  CONSTRAINT `FKavav8ra57yjo4ncc8f4fsjawd` FOREIGN KEY (`modulo_id`) REFERENCES `moduli` (`id`),
  CONSTRAINT `FKk8ios3mukrdgghsb3lgpcw1tt` FOREIGN KEY (`studente_id`) REFERENCES `studenti` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
