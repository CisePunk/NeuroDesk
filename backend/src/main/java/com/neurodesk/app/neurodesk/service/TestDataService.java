package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.entity.Studente;
import com.neurodesk.app.neurodesk.repository.StudenteRepository;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Genera e rimuove utenti FITTIZI, solo per l'ambiente di test.
 * Non c'e' registrazione pubblica di utenti reali: in produzione questa via
 * e' chiusa (vedi TestDataController + neurodesk.test-mode). Tutti gli utenti
 * generati qui hanno email sul dominio riservato {@link #TEST_EMAIL_DOMAIN},
 * cosi' sono riconoscibili e cancellabili in blocco senza toccare dati reali.
 * Come gli utenti veri, ognuno riceve un account-codice anonimo collegato.
 */
@Service
@RequiredArgsConstructor
public class TestDataService {

    public static final String TEST_EMAIL_DOMAIN = "@test.neurodesk.local";

    private static final String[] NOMI = {
            "Giulia", "Marco", "Sara", "Luca", "Chiara", "Davide",
            "Elena", "Matteo", "Alice", "Francesco", "Aisha", "Youssef"
    };
    private static final String[] COGNOMI = {
            "Rossi", "Bianchi", "Esposito", "Romano", "Ferrari",
            "Conti", "Greco", "Bruno", "De Luca", "Rizzo"
    };
    private static final String[] ENERGIE = { "bassa", "media", "alta" };

    private final StudenteRepository studenteRepository;
    private final UtenteRepository utenteRepository;
    private final StudenteService studenteService;

    @Transactional
    public List<StudenteDto> seedStudenti(int count) {
        List<StudenteDto> creati = new ArrayList<>();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        for (int i = 0; i < count; i++) {
            String nome = NOMI[rnd.nextInt(NOMI.length)];
            String cognome = COGNOMI[rnd.nextInt(COGNOMI.length)];
            StudenteDto dto = StudenteDto.builder()
                    .nome(nome)
                    .cognome(cognome)
                    .email(generaEmailUnica(nome, cognome))
                    .attivo(true)
                    .livelloEnergiaPreferito(ENERGIE[rnd.nextInt(ENERGIE.length)])
                    .build();
            // save() registra l'anagrafica E genera il codice/account anonimo collegato.
            creati.add(studenteService.save(dto));
        }
        return creati;
    }

    @Transactional
    public int rimuoviStudentiDiTest() {
        List<Studente> testUsers = studenteRepository.findByEmailEndingWith(TEST_EMAIL_DOMAIN);
        // Rimuovi anche gli account-codice anonimi collegati, per non lasciare orfani.
        for (Studente s : testUsers) {
            if (s.getUtenteId() != null) {
                utenteRepository.deleteById(s.getUtenteId());
            }
        }
        studenteRepository.deleteAll(testUsers);
        return testUsers.size();
    }

    private String generaEmailUnica(String nome, String cognome) {
        String base = (nome + "." + cognome)
                .toLowerCase()
                .replace(" ", "")
                .replace("a'", "a");
        String email;
        do {
            int suffix = ThreadLocalRandom.current().nextInt(1000, 999999);
            email = base + "." + suffix + TEST_EMAIL_DOMAIN;
        } while (studenteRepository.existsByEmail(email));
        return email;
    }
}
