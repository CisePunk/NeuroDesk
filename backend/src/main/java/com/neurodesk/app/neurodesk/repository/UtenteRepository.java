package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.Ruolo;
import com.neurodesk.app.neurodesk.entity.Utente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UtenteRepository extends JpaRepository<Utente, Long> {
    Optional<Utente> findByLoginHash(String loginHash);

    boolean existsByLoginHash(String loginHash);

    boolean existsByRuolo(Ruolo ruolo);

    List<Utente> findByRuoloOrderByCreatoIlDesc(Ruolo ruolo);
}
