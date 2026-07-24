package com.neurodesk.app.neurodesk.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Domande FISSE del feedback tester, definite in un unico posto. Guidano tre cose:
 * la validazione dell'invio, il rendering dei pulsanti nel form (via /schema) e le
 * intestazioni dell'export CSV. Per cambiare le domande si modifica solo qui.
 */
public final class FeedbackCatalogo {

    private FeedbackCatalogo() {
    }

    /** Una risposta possibile: {@code valore} e' l'id salvato, {@code etichetta} il testo mostrato. */
    public record Opzione(String valore, String etichetta) {
    }

    /** Una domanda a scelta singola. */
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

    private static Opzione op(String valore, String etichetta) {
        return new Opzione(valore, etichetta);
    }

    public static final List<Domanda> DOMANDE = List.of(
            new Domanda("grafica", "Cosa pensi della grafica?", List.of(
                    op("molto_bella", "Molto bella"),
                    op("bella", "Bella"),
                    op("normale", "Normale"),
                    op("brutta", "Brutta"),
                    op("molto_brutta", "Molto brutta"))),
            new Domanda("facilita", "Quanto e' facile da usare?", List.of(
                    op("molto_facile", "Molto facile"),
                    op("facile", "Facile"),
                    op("normale", "Normale"),
                    op("difficile", "Difficile"),
                    op("molto_difficile", "Molto difficile"))),
            new Domanda("utilita", "Il Companion ti e' stato utile?", List.of(
                    op("molto", "Molto"),
                    op("abbastanza", "Abbastanza"),
                    op("poco", "Poco"),
                    op("per_niente", "Per niente"))),
            new Domanda("errori", "Hai avuto errori o blocchi tecnici?", List.of(
                    op("mai", "Mai"),
                    op("qualche_volta", "Qualche volta"),
                    op("spesso", "Spesso"))));

    private static final Map<String, Domanda> PER_ID =
            DOMANDE.stream().collect(Collectors.toMap(Domanda::id, d -> d));

    public static Domanda byId(String id) {
        return PER_ID.get(id);
    }
}
