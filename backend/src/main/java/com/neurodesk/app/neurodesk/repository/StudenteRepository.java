package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.Studente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudenteRepository extends JpaRepository<Studente, Long> {
    Optional<Studente> findByEmail(String email);

    boolean existsByEmail(String email);
}