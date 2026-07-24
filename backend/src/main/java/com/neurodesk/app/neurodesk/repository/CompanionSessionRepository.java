package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.CompanionSession;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
