-- Etichette sui messaggi del Companion.
--
-- Chi usa il Companion puo' marcare un messaggio come inizio di un tratto di
-- conversazione, e poi scegliere di rimandare al modello solo da quel punto in
-- poi invece di tutta la cronologia. Due motivi: risparmiare token, e sapere con
-- certezza cosa il modello sta ricevendo di se' in quello scambio.
--
-- L'etichetta e' testo scritto liberamente dalla persona, quindi va cifrata come
-- il contenuto del messaggio (`contenuto_cifrato`): NON e' come `titolo` della
-- sessione, che resta in chiaro solo perche' arriva da un vocabolario chiuso (il
-- nome della modalita', mai testo dell'utente). Qui il rischio e' lo stesso di
-- un messaggio: la persona potrebbe scrivere "quando ho detto di mio padre".
--
-- NULL per difetto: nessun messaggio ha un'etichetta finche' qualcuno non la
-- imposta. Nessuna riga esistente viene toccata da questa migrazione.

ALTER TABLE `companion_messaggi`
  ADD COLUMN `etichetta_cifrata` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL;
