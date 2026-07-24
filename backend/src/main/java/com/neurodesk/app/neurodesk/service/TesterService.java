package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.TesterCreatoResponse;
import com.neurodesk.app.neurodesk.dto.TesterResponse;
import com.neurodesk.app.neurodesk.entity.Ruolo;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import com.neurodesk.app.neurodesk.security.CodeGenerator;
import com.neurodesk.app.neurodesk.security.HashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Creazione/gestione dei tester (utenti STUDENTE anonimi). Il codice in chiaro
 * esiste solo per l'istante della creazione: nel DB va solo il suo hash.
 */
@Service
@RequiredArgsConstructor
public class TesterService {

    private final UtenteRepository utenteRepository;
    private final HashService hashService;
    private final CodeGenerator codeGenerator;

    @Transactional
    public TesterCreatoResponse crea(String etichetta) {
        for (int tentativi = 0; tentativi < 5; tentativi++) {
            String codice = codeGenerator.generaCodice();
            String hash = hashService.loginHash(codice);
            if (!utenteRepository.existsByLoginHash(hash)) {
                Utente tester = Utente.builder()
                        .loginHash(hash)
                        .ruolo(Ruolo.STUDENTE)
                        .attivo(true)
                        .etichetta(etichetta != null && !etichetta.isBlank() ? etichetta.trim() : null)
                        .build();
                tester = utenteRepository.save(tester);
                return new TesterCreatoResponse(tester.getId(), codice, tester.getEtichetta());
            }
        }
        // Con 80 bit di entropia e' praticamente impossibile: fallisci esplicito, non salvare un duplicato.
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Impossibile generare un codice univoco. Riprova.");
    }

    public List<TesterResponse> lista() {
        return utenteRepository.findByRuoloOrderByCreatoIlDesc(Ruolo.STUDENTE).stream()
                .map(u -> new TesterResponse(
                        u.getId(),
                        u.getEtichetta(),
                        Boolean.TRUE.equals(u.getAttivo()),
                        u.getConsensoIl() != null,
                        u.getCreatoIl()))
                .toList();
    }

    @Transactional
    public void impostaStato(Long id, boolean attivo) {
        Utente tester = utenteRepository.findById(id)
                .filter(u -> u.getRuolo() == Ruolo.STUDENTE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tester non trovato"));
        tester.setAttivo(attivo);
        utenteRepository.save(tester);
    }
}
