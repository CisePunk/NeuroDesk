-- Chiave AI propria: "bring your own token".
--
-- Un tester puo' portare la propria chiave API. Da quel momento le sue risposte
-- vengono addebitate sul SUO conto Anthropic/OpenAI, non sul nostro. Chi non ne
-- ha una continua a usare il credito comune, esattamente come prima: la colonna
-- resta NULL e non cambia niente.
--
-- La chiave e' CIFRATA (AES-256-GCM, la stessa chiave e lo stesso servizio con
-- cui si cifrano le conversazioni). Nel database non compare mai in chiaro.
--
-- Perche' la custodiamo, e cosa vuol dire: una chiave API e' una credenziale
-- che spende soldi senza tetto. Trattarla come un dato qualunque sarebbe
-- sbagliato: qui vale la stessa protezione dei dati di salute, che e' la piu'
-- alta che abbiamo.
--
-- Non esce MAI verso il browser: la pagina Codici mostra soltanto se c'e' o non
-- c'e'. Esce solo sul canale interno verso il companion-service, che deve
-- decifrarla per usarla.

ALTER TABLE `utenti`
  -- Testo cifrato, base64: piu' lungo dell'originale, teniamo largo.
  ADD COLUMN `chiave_ai_cifrata` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  -- Per quale fornitore vale: 'anthropic' o 'openai'. Serve al companion per
  -- sapere a chi telefonare, senza doverlo indovinare dal formato della chiave.
  ADD COLUMN `chiave_ai_provider` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  -- Quando e' stata impostata. Non e' burocrazia: se un giorno quella chiave
  -- trapela, la prima domanda e' "da quando era li'".
  ADD COLUMN `chiave_ai_impostata_il` datetime(6) DEFAULT NULL;

-- Chi ha portato la propria chiave non pesa sul credito comune. Il consumo si
-- misura lo stesso — serve comunque a vedere chi usa quanto — ma va letto in
-- un'altra colonna, altrimenti la spesa in euro conterebbe anche quella che
-- paga qualcun altro.
ALTER TABLE `companion_consumo`
  ADD COLUMN `pagato_da_utente` bit(1) NOT NULL DEFAULT b'0';
