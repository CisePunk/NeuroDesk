package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.ConsumoAi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ConsumoAiRepository extends JpaRepository<ConsumoAi, Long> {

    /**
     * Consumo per accesso: quante chiamate e quanti token, e quando e' stata
     * l'ultima. E' la vista che serve per accorgersi che un codice consuma dieci
     * volte la media degli altri.
     * Ritorna [utenteId, chiamate, tokenInput, tokenOutput, ultimoUso].
     */
    @Query("""
           SELECT c.utenteId, COUNT(c), COALESCE(SUM(c.tokenInput), 0),
                  COALESCE(SUM(c.tokenOutput), 0), MAX(c.creatoIl)
             FROM ConsumoAi c
            GROUP BY c.utenteId
           """)
    List<Object[]> riepilogoPerUtente();

    /** Token totali consumati da una certa data in poi: serve per l'allarme sulla spesa. */
    @Query("""
           SELECT COALESCE(SUM(c.tokenInput), 0), COALESCE(SUM(c.tokenOutput), 0), COUNT(c)
             FROM ConsumoAi c
            WHERE c.creatoIl >= :da
           """)
    List<Object[]> totaleDa(@Param("da") LocalDateTime da);

    /** Quante richieste sono state servite dal provider di ripiego: se cresce, il primario ha problemi. */
    long countByRipiegoDaIsNotNullAndCreatoIlGreaterThanEqual(LocalDateTime da);

    /**
     * Consumo diviso per provider e modello. Serve per la spesa: un token di
     * Sonnet e uno di Haiku costano tre volte diverso, quindi sommarli tutti
     * insieme darebbe un euro sbagliato. Ritorna [provider, modello, in, out, chiamate].
     */
    @Query("""
           SELECT c.provider, c.modello, COALESCE(SUM(c.tokenInput), 0),
                  COALESCE(SUM(c.tokenOutput), 0), COUNT(c)
             FROM ConsumoAi c
            WHERE c.pagatoDaUtente = false
            GROUP BY c.provider, c.modello
           """)
    List<Object[]> riepilogoPerModello();

    /** Come sopra ma da una data in poi: e' il ritmo su cui si calcola quando finisce il credito. */
    @Query("""
           SELECT c.provider, c.modello, COALESCE(SUM(c.tokenInput), 0),
                  COALESCE(SUM(c.tokenOutput), 0), COUNT(c)
             FROM ConsumoAi c
            WHERE c.creatoIl >= :da AND c.pagatoDaUtente = false
            GROUP BY c.provider, c.modello
           """)
    List<Object[]> riepilogoPerModelloDa(@Param("da") LocalDateTime da);

    /** Quando e' cominciato il registro: sotto i sette giorni la proiezione si fa su questo. */
    @Query("SELECT MIN(c.creatoIl) FROM ConsumoAi c")
    LocalDateTime primaRegistrazione();

    /**
     * Token totali a carico del credito COMUNE per un tester (esclusa la sua
     * chiave propria): base del tetto di consumo, da confrontare con la soglia
     * configurata. Chi porta la propria chiave non pesa qui.
     */
    @Query("""
           SELECT COALESCE(SUM(c.tokenInput + c.tokenOutput), 0)
             FROM ConsumoAi c
            WHERE c.utenteId = :utenteId AND c.pagatoDaUtente = false
           """)
    long tokenCondivisiPerUtente(@Param("utenteId") Long utenteId);
}
