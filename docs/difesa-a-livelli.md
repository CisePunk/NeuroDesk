# La difesa, a più livelli

NeuroDesk è un sito piccolo che tratta dati di salute. Per questo è difeso come se
fosse grande. Non c'è un muro solo: ce ne sono diversi, ognuno con un compito
diverso, messi in fila in modo che leggere il codice non aiuti a entrare. Il codice
è pubblico apposta — una sicurezza che regge solo finché il sorgente resta segreto
non è sicurezza. Le uniche cose che non stanno qui sono quelle che un lucchetto
tiene fuori dal mazzo di chiavi, non il disegno della serratura.

Dall'esterno verso l'interno.

## La porta

Davanti a tutto c'è Caddy. Fa l'HTTPS da sé e lascia aperte solo tre porte; il
database e i servizi interni non escono da localhost.

Il sito risponde «esiste» soltanto agli indirizzi veri: le sue rotte, i suoi file.
A qualunque altra cosa risponde 404, con una pagina leggibile invece di una porta
muta. Non per nascondersi — da un 404 uno scanner non impara niente — ma perché un
sito che dice «sì, quello c'è» a ogni tentativo sta perdendo informazioni, e perché
quel 404 è anche il segnale più pulito per il livello che osserva.

Il canale interno, quello che decifra la chiave AI di un tester, dal web non esiste:
risponde 404, ed è protetto da un confronto a tempo costante.

## Chi entra

Si entra con un codice, non con nome ed email. Nel database il codice non c'è: c'è
la sua impronta, un hash con un pepe che sta solo sul server, così un dump del
database non riporta ai codici.

A chi non ha fatto login le funzioni riservate rispondono 401. A chi ha fatto login
ma non ha il ruolo giusto rispondono 403: non basta essere dentro. E la conversazione
di un altro non viene «trovata e poi negata» — ogni query cerca per identificativo e
proprietario insieme, quindi non viene proprio trovata, come una che non esiste.

I contenuti sono dati sulla salute e sono cifrati a riposo. Con un confine detto
chiaro: la cifratura protegge dal furto del database o di un backup, non da
un'applicazione già compromessa. È una protezione reale, con un perimetro reale.
Tutto si cancella a trenta giorni.

## Chi osserva

Un sito pubblico viene bussato tutto il giorno: è il rumore di fondo di internet, e
non è un attacco. Perciò il livello di rilevamento non guarda il singolo colpo,
guarda la forma di una sessione. Una scansione ampia lascia una traccia diversa da
una persona che sbaglia a digitare, e diversa ancora da chi prova a enumerare le
risorse cambiando un numero nell'URL.

Le soglie che distinguono le une dalle altre non sono state scelte a intuito: sono
state misurate sul traffico vero, e la misura ha smentito le ipotesi facili — le
richieste al secondo, per esempio, non separavano niente. Questo livello osserva e
registra. Non blocca: bloccare è compito dei livelli sotto, e un allarme che scatta
su un caso innocente vale meno di zero.

## Chi blocca

Dove l'osservatore prende nota, questo morde. Blocca al firewall chi manda quello
che un utente vero non manda mai — le stringhe di iniezione, l'attraversamento di
cartelle, le righe di CRLF — e chi tempesta di 404. Chi torna dopo essere già stato
bloccato resta fuori più a lungo.

Anche qui la taratura è sul traffico reale, per la stessa ragione di prima: la regola
deve prendere lo scanner e lasciare in pace chi ha solo un vecchio segnalibro.

## Chi ha già visto

L'ultimo livello non guarda solo noi. Attinge a una lista di reputazione condivisa:
un indirizzo che ha già attaccato qualcun altro, nella rete di chi usa lo stesso
sistema, qui viene fermato prima di cominciare. Sono decine di migliaia, e la lista
si aggiorna da sola.

## Chi tiene il conto

Ogni tre giorni un controllo guarda l'integrità, gli accessi, gli aggiornamenti
mancanti. Ogni mattina una mail riassume cosa hanno fermato le difese nelle ultime
ventiquattr'ore, con in evidenza la cosa che conta — non i numeri enormi del rumore
già bloccato, ma le poche righe di chi ha puntato proprio noi. Una copia dei dati
lascia il server tutti i giorni.

## Cosa non copre, detto onestamente

Niente di tutto questo protegge da un server già compromesso: a quel punto la chiave
è in memoria. Gli identificativi delle risorse sono numeri progressivi, quindi chi
vede il proprio può stimare il volume totale — non è il dato di nessuno, ma è
un'informazione di scala. E il livello più basso, la macchina, è coperto dal
controllo ogni tre giorni, non in tempo reale.

Questa è la fotografia di oggi. Va rifatta quando cambia la superficie, o quando un
occhio esterno indipendente conduce un test suo.
