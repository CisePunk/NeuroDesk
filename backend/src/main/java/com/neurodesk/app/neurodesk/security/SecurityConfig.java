package com.neurodesk.app.neurodesk.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // Origini ammesse dal CORS, separate da virgola. Default: dev server Vite.
    // In produzione impostare neurodesk.cors.allowed-origins=https://tuo-dominio
    @Value("${neurodesk.cors.allowed-origins:http://localhost:5173}")
    private List<String> corsAllowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login").permitAll()
                        // Dispatch interno di Spring Boot quando un controller lancia un'eccezione.
                        .requestMatchers("/error").permitAll()
                        // Solo l'health check e' pubblico; ogni altro endpoint actuator richiede auth.
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        // Gestione codici tester: solo l'admin SCUOLA.
                        .requestMatchers("/api/tester/**").hasRole("SCUOLA")
                        // Seed utenti FITTIZI: difesa in profondita' -> serve il ruolo SCUOLA
                        // (in aggiunta al flag test-mode nel controller). Cosi' un test-mode
                        // acceso per errore non e' comunque raggiungibile in anonimo.
                        .requestMatchers("/api/test/**").hasRole("SCUOLA")
                        // Gestione studenti/moduli/task: solo l'admin SCUOLA (chiude A2).
                        .requestMatchers("/api/studenti/**", "/api/moduli/**", "/api/task/**").hasRole("SCUOLA")
                        // Report ed export dei feedback: solo SCUOLA. L'invio del feedback e lo
                        // schema delle domande restano a ogni utente autenticato (i tester).
                        .requestMatchers("/api/feedback/report", "/api/feedback/export.csv").hasRole("SCUOLA")
                        // Tutto il resto (incluso /api/auth/me, /api/auth/consenso) richiede un token valido.
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsAllowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
