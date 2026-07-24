package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.entity.Studente;
import com.neurodesk.app.neurodesk.mapper.StudenteMapper;
import com.neurodesk.app.neurodesk.repository.StudenteRepository;
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
    private static final String[] PROFILI = {
            "ADHD", "Dislessia", "Alto carico cognitivo",
            "Difficolta di memoria", "Studio non lineare", ""
    };
    private static final String[] ENERGIE = { "bassa", "media", "alta" };

    private final StudenteRepository studenteRepository;
    private final StudenteMapper studenteMapper;

    @Transactional
    public List<StudenteDto> seedStudenti(int count) {
        List<StudenteDto> creati = new ArrayList<>();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        for (int i = 0; i < count; i++) {
            String nome = NOMI[rnd.nextInt(NOMI.length)];
            String cognome = COGNOMI[rnd.nextInt(COGNOMI.length)];
            Studente studente = Studente.builder()
                    .nome(nome)
                    .cognome(cognome)
                    .email(generaEmailUnica(nome, cognome))
                    .attivo(true)
                    .profiloNeurodivergente(PROFILI[rnd.nextInt(PROFILI.length)])
                    .livelloEnergiaPreferito(ENERGIE[rnd.nextInt(ENERGIE.length)])
                    .build();
            creati.add(studenteMapper.toDto(studenteRepository.save(studente)));
        }
        return creati;
    }

    @Transactional
    public int rimuoviStudentiDiTest() {
        List<Studente> testUsers = studenteRepository.findByEmailEndingWith(TEST_EMAIL_DOMAIN);
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
