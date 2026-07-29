/**
 * Lingua dell'interfaccia. Primo pezzo, volutamente minuscolo.
 *
 * Per ora la usa solo la pagina Feedback, che era il punto in cui l'italiano
 * bloccava davvero qualcuno: chiedere un parere in una lingua che non si parla
 * significa ricevere i clic sui pulsanti e mai il commento libero, che è la
 * parte che vale.
 *
 * Nessuna libreria: un dizionario e una funzione. Quando tradurremo tutta l'app
 * questo file cresce, non viene sostituito — e non ci sono dipendenze nuove da
 * aggiornare per una cosa che è, in fondo, un oggetto con dentro delle stringhe.
 *
 * La lingua viene dal browser. Non c'è ancora un selettore: aggiungerlo vorrà
 * dire salvare la scelta qui e leggerla al posto di navigator.language.
 */

export const LINGUE = ['it', 'en', 'fr'];

/** Lingua del browser ridotta a due lettere; qualunque altra cosa diventa italiano. */
export function linguaCorrente() {
    try {
        // "en-NZ" -> "en", "fr-CA" -> "fr": del tag ci serve solo la prima parte.
        const tag = (navigator.language || 'it').toLowerCase().slice(0, 2);
        return LINGUE.includes(tag) ? tag : 'it';
    } catch {
        // Ambienti senza navigator (test, rendering lato server): italiano.
        return 'it';
    }
}

const DIZIONARIO = {
    it: {
        titolo: 'Feedback',
        caricamento: 'Caricamento…',
        intro: "Siamo in fase di test: dicci com'è andata. Bastano pochi tocchi, i commenti sono facoltativi.",
        grazieBreve: 'Grazie! Il tuo feedback è stato inviato.',
        grazieTitolo: 'Grazie di cuore.',
        grazieTesto: 'Il tuo parere ci aiuta a migliorare NeuroDesk.',
        altroFeedback: 'Lascia un altro feedback',
        etichettaErrori: 'Se hai avuto errori o blocchi, descrivili',
        segnapostoErrori: 'Es. cliccando su Salva non succedeva niente…',
        etichettaCommento: 'Altri commenti (facoltativo)',
        segnapostoCommento: 'Cosa ti è piaciuto, cosa cambieresti…',
        invia: 'Invia feedback',
        invioInCorso: 'Invio…',
    },
    en: {
        titolo: 'Feedback',
        caricamento: 'Loading…',
        intro: 'We are still testing: tell us how it went. A few taps are enough — the comments are optional.',
        grazieBreve: 'Thank you! Your feedback has been sent.',
        grazieTitolo: 'Thank you, truly.',
        grazieTesto: 'What you tell us is how NeuroDesk gets better.',
        altroFeedback: 'Leave more feedback',
        etichettaErrori: 'If something broke or got stuck, tell us what happened',
        segnapostoErrori: 'e.g. I pressed Save and nothing happened…',
        etichettaCommento: 'Anything else (optional)',
        segnapostoCommento: 'What you liked, what you would change…',
        invia: 'Send feedback',
        invioInCorso: 'Sending…',
    },
    fr: {
        titolo: 'Retour',
        caricamento: 'Chargement…',
        intro: "Nous sommes en phase de test : dis-nous comment ça s'est passé. Quelques touches suffisent, les commentaires sont facultatifs.",
        grazieBreve: 'Merci ! Ton retour a bien été envoyé.',
        grazieTitolo: 'Merci beaucoup.',
        grazieTesto: "Ce que tu nous dis, c'est ce qui fait avancer NeuroDesk.",
        altroFeedback: 'Laisser un autre retour',
        etichettaErrori: "Si quelque chose s'est bloqué, raconte-nous",
        segnapostoErrori: "ex. j'ai appuyé sur Enregistrer et rien ne s'est passé…",
        etichettaCommento: 'Autre chose (facultatif)',
        segnapostoCommento: 'Ce qui t\'a plu, ce que tu changerais…',
        invia: 'Envoyer',
        invioInCorso: 'Envoi…',
    },
};

/** Le stringhe della pagina Feedback nella lingua data (o in quella del browser). */
export function testiFeedback(lingua = linguaCorrente()) {
    return DIZIONARIO[lingua] ?? DIZIONARIO.it;
}
