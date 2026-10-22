package com.neurodesk.app.neurodesk.config;

import java.util.Map;

import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.webmvc.error.DefaultErrorAttributes;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;

/**
 * Pagina d'errore anonima: espone SOLO lo stato HTTP.
 *
 * La risposta d'errore predefinita di Spring Boot ha la forma
 * {@code {"timestamp","status","error","path"}}: quella forma e' un'impronta che
 * fa riconoscere il framework a chi sonda il sito, e "path" rivela percorsi
 * interni. Qui teniamo solo {@code status}, cosi' un errore dice "non ha
 * funzionato, con questo codice" e nient'altro.
 *
 * Non serve configurare {@code server.error.*}: questo override vale comunque,
 * perche' sostituisce l'unico bean che costruisce il corpo dell'errore.
 */
@Component
public class ErroriAnonimi extends DefaultErrorAttributes {

    @Override
    public Map<String, Object> getErrorAttributes(WebRequest webRequest, ErrorAttributeOptions options) {
        Map<String, Object> originali = super.getErrorAttributes(webRequest, options);
        // Solo lo stato HTTP; se mancasse, 500 come default prudente.
        return Map.of("status", originali.getOrDefault("status", 500));
    }
}
