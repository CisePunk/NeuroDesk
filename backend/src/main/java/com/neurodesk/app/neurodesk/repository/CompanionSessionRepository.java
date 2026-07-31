package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.CompanionSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CompanionSessionRepository extends JpaRepository<CompanionSession, Long> {

    List<CompanionSession> findByUtenteIdOrderByAggiornatoIlDesc(Long utenteId);

    Optional<CompanionSession> findByIdAndUtenteId(Long id, Long utenteId);

    /** Cancellazione in blocco delle sessioni di un utente (diritto all'oblio / rimozione tester). */
    void deleteByUtenteId(Long utenteId);

    /** Retention: sessioni non toccate da prima della soglia (per la pulizia a 30 giorni). */
    List<CompanionSession> findByAggiornatoIlBefore(LocalDateTime soglia);

    /**
     * Attivita' REALE per utente, dai messaggi effettivi: quanti ne ha scritti,
     * la prima volta e l'ultima. E' la fonte giusta per "chi ha usato il
     * Companion e quando" — diversa dalla tabella del consumo token, che esiste
     * solo dal 28 luglio 2026 e non copre chi ha usato prima.
     * Conta solo i messaggi dell'UTENTE (ruolo 'user'), non le risposte.
     * Ritorna [utenteId, numeroMessaggi, primaAttivita, ultimaAttivita].
     */
    @Query("""
           SELECT s.utenteId, COUNT(m), MIN(m.creatoIl), MAX(m.creatoIl)
             FROM CompanionSession s JOIN s.messaggi m
            WHERE m.ruolo = 'user'
            GROUP BY s.utenteId
           """)
    List<Object[]> attivitaPerUtente();
}
