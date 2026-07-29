package com.neurodesk.app.neurodesk.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Domande FISSE del feedback tester, definite in un unico posto. Guidano tre cose:
 * la validazione dell'invio, il rendering dei pulsanti nel form (via /schema) e le
 * intestazioni dell'export CSV. Per cambiare le domande si modifica solo qui.
 *
 * <p>Le domande esistono in italiano, inglese e francese perche' i tester non sono
 * tutti italiani: chiedere un parere in una lingua che non si parla significa
 * ricevere solo i clic sui pulsanti e mai il commento libero, che e' la parte che
 * vale. Il VALORE salvato ({@code molto_bella}, {@code facile}, ...) resta pero'
 * sempre lo stesso: cambia solo l'etichetta mostrata. Cosi' il report aggregato e
 * l'export CSV continuano a funzionare e restano confrontabili fra lingue diverse.
 */
public final class FeedbackCatalogo {

    private FeedbackCatalogo() {
    }

    /** Lingue in cui sappiamo chiedere. L'italiano e' il ripiego per tutte le altre. */
    public static final List<String> LINGUE = List.of("it", "en", "fr");

    /**
     * Una risposta possibile.
     *
     * @param valore     l'id salvato nel database: NON cambia mai con la lingua
     * @param etichetta  il testo mostrato, gia' nella lingua richiesta
     */
    public record Opzione(String valore, String etichetta) {
    }

    /** Una domanda a scelta singola, gia' nella lingua richiesta. */
    public record Domanda(String id, String testo, List<Opzione> opzioni) {
        public boolean ammette(String valore) {
            return opzioni.stream().anyMatch(o -> o.valore().equals(valore));
        }

        public String etichettaDi(String valore) {
            return opzioni.stream()
                    .filter(o -> o.valore().equals(valore))
                    .map(Opzione::etichetta)
                    .findFirst()
                    .orElse(valore);
        }
    }

    /** Le tre traduzioni di una stessa risposta, tenute insieme al valore salvato. */
    private record OpzioneTradotta(String valore, String it, String en, String fr) {
        Opzione in(String lingua) {
            return new Opzione(valore, switch (lingua) {
                case "en" -> en;
                case "fr" -> fr;
                default -> it;
            });
        }
    }

    /** Le tre traduzioni di una stessa domanda. */
    private record DomandaTradotta(String id, String it, String en, String fr, List<OpzioneTradotta> opzioni) {
        Domanda in(String lingua) {
            String testo = switch (lingua) {
                case "en" -> en;
                case "fr" -> fr;
                default -> it;
            };
            return new Domanda(id, testo, opzioni.stream().map(o -> o.in(lingua)).toList());
        }
    }

    private static OpzioneTradotta op(String valore, String it, String en, String fr) {
        return new OpzioneTradotta(valore, it, en, fr);
    }

    private static final List<DomandaTradotta> CATALOGO = List.of(
            new DomandaTradotta("grafica",
                    "Cosa pensi della grafica?",
                    "What do you think of the look?",
                    "Que penses-tu de l'apparence ?",
                    List.of(
                            op("molto_bella", "Molto bella", "Very nice", "Très belle"),
                            op("bella", "Bella", "Nice", "Belle"),
                            op("normale", "Normale", "Okay", "Correcte"),
                            op("brutta", "Brutta", "Not nice", "Pas belle"),
                            op("molto_brutta", "Molto brutta", "Very poor", "Très laide"))),
            new DomandaTradotta("facilita",
                    "Quanto e' facile da usare?",
                    "How easy is it to use?",
                    "Est-ce facile à utiliser ?",
                    List.of(
                            op("molto_facile", "Molto facile", "Very easy", "Très facile"),
                            op("facile", "Facile", "Easy", "Facile"),
                            op("normale", "Normale", "Okay", "Correct"),
                            op("difficile", "Difficile", "Hard", "Difficile"),
                            op("molto_difficile", "Molto difficile", "Very hard", "Très difficile"))),
            new DomandaTradotta("utilita",
                    "Il Companion ti e' stato utile?",
                    "Was the Companion useful to you?",
                    "Le Companion t'a-t-il été utile ?",
                    List.of(
                            op("molto", "Molto", "Very", "Beaucoup"),
                            op("abbastanza", "Abbastanza", "Fairly", "Assez"),
                            op("poco", "Poco", "Not much", "Peu"),
                            op("per_niente", "Per niente", "Not at all", "Pas du tout"))),
            new DomandaTradotta("errori",
                    "Hai avuto errori o blocchi tecnici?",
                    "Did anything break or get stuck?",
                    "As-tu rencontré des erreurs ou des blocages ?",
                    List.of(
                            op("mai", "Mai", "Never", "Jamais"),
                            op("qualche_volta", "Qualche volta", "Sometimes", "Parfois"),
                            op("spesso", "Spesso", "Often", "Souvent"))),
            // Domanda aggiunta il 29 luglio 2026 per decidere con un numero, e non
            // con un'impressione, se costruire uno spazio dove i tester possano
            // parlarsi. Le risposte sono scritte per NON spingere verso il si':
            // "no, preferisco da solo" e' messa come scelta legittima e non come
            // rifiuto, altrimenti si misura la cortesia invece del bisogno.
            new DomandaTradotta("comunita",
                    "Ti piacerebbe un posto dove confrontarti con altri che hanno le tue stesse difficoltà?",
                    "Would you like a place to talk things over with others facing the same difficulties?",
                    "Aimerais-tu un endroit pour échanger avec d'autres qui vivent les mêmes difficultés ?",
                    List.of(
                            op("si_molto", "Sì, mi piacerebbe molto", "Yes, I would like that a lot", "Oui, beaucoup"),
                            op("si_forse", "Forse, dipende da com'è fatto", "Maybe, depending how it works", "Peut-être, selon la forme"),
                            op("no_solo", "No, preferisco usarlo da solo", "No, I prefer using it on my own", "Non, je préfère l'utiliser seul"),
                            op("non_so", "Non saprei", "Not sure", "Je ne sais pas"))));

    /** Le domande in italiano. Usate dal report e dall'export CSV, che leggi tu. */
    public static final List<Domanda> DOMANDE = in("it");

    /** Le domande nella lingua richiesta; qualunque lingua sconosciuta ricade sull'italiano. */
    public static List<Domanda> in(String lingua) {
        String l = lingua == null ? "it" : lingua.toLowerCase();
        // "en-NZ", "fr-CA": del tag lingua del browser ci interessa solo la prima parte.
        if (l.length() > 2) l = l.substring(0, 2);
        String scelta = LINGUE.contains(l) ? l : "it";
        return CATALOGO.stream().map(d -> d.in(scelta)).toList();
    }

    private static final Map<String, Domanda> PER_ID =
            DOMANDE.stream().collect(Collectors.toMap(Domanda::id, d -> d));

    public static Domanda byId(String id) {
        return PER_ID.get(id);
    }
}
