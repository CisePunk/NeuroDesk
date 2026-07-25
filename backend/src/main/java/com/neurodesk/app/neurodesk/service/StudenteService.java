package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.dto.TesterCreatoResponse;
import com.neurodesk.app.neurodesk.entity.Studente;
import com.neurodesk.app.neurodesk.mapper.StudenteMapper;
import com.neurodesk.app.neurodesk.repository.StudenteRepository;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Anagrafica utenti gestita dalla SCUOLA. Ogni utente registrato ha un nome (qui)
 * e un account-codice ANONIMO collegato (via utenteId): il nome vive nell'anagrafica,
 * i dati/chat vivono sul codice. È la pseudonimizzazione che copre il GDPR.
 */
@Service
@RequiredArgsConstructor
public class StudenteService {

    private final StudenteRepository studenteRepository;
    private final UtenteRepository utenteRepository;
    private final StudenteMapper studenteMapper;
    private final TesterService testerService;

    public List<StudenteDto> findAll() {
        return studenteRepository.findAll().stream().map(s -> {
            StudenteDto dto = studenteMapper.toDto(s);
            // Stato reale dell'accesso + consenso: dall'account-codice collegato.
            if (s.getUtenteId() != null) {
                utenteRepository.findById(s.getUtenteId()).ifPresent(u -> {
                    dto.setAttivo(Boolean.TRUE.equals(u.getAttivo()));
                    dto.setConsensoDato(u.getConsensoIl() != null);
                });
            }
            return dto;
        }).toList();
    }

    /** Registra l'utente (anagrafica) e gli genera un codice di accesso ANONIMO collegato. */
    @Transactional
    public StudenteDto save(StudenteDto dto) {
        // 1) Genera l'account-codice anonimo: nessun nome nell'account (etichetta null).
        TesterCreatoResponse account = testerService.crea(null);
        // 2) Salva l'anagrafica col nome, collegata all'account.
        Studente studente = studenteMapper.toEntity(dto);
        studente.setUtenteId(account.getId());
        studente = studenteRepository.save(studente);
        // 3) Risposta: dati + codice in chiaro UNA sola volta.
        StudenteDto out = studenteMapper.toDto(studente);
        out.setCodice(account.getCodice());
        out.setConsensoDato(false);
        return out;
    }

    /** Attiva/revoca l'accesso: agisce sull'account-codice collegato e lo rispecchia sull'anagrafica. */
    @Transactional
    public void impostaStato(Long id, boolean attivo) {
        Studente studente = studenteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
        studente.setAttivo(attivo);
        studenteRepository.save(studente);
        if (studente.getUtenteId() != null) {
            testerService.impostaStato(studente.getUtenteId(), attivo);
        }
    }
}
