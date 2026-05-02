package com.guitartutorial.config;

import com.guitartutorial.security.CurrentUserIdArgumentResolver;
import com.guitartutorial.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig implements WebMvcConfigurer {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CurrentUserIdArgumentResolver currentUserIdArgumentResolver;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CurrentUserIdArgumentResolver currentUserIdArgumentResolver) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.currentUserIdArgumentResolver = currentUserIdArgumentResolver;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())  // Stateless REST API — no CSRF needed
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public auth endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                // Authenticated auth endpoints
                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                // Tutorials — public read
                .requestMatchers(HttpMethod.GET, "/api/tutorials/**").permitAll()
                // Tutorials — authenticated write
                .requestMatchers(HttpMethod.POST, "/api/tutorials/create").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/tutorials/{id}/upload-files").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/tutorials/{id}/pdf").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/tutorials/{id}/metadata").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tutorials/search/**").permitAll()
                // Comments
                .requestMatchers(HttpMethod.GET, "/api/comments/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/comments/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/comments/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/comments/**").authenticated()
                // Annotations
                .requestMatchers(HttpMethod.GET, "/api/annotations/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/annotations/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/annotations/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/annotations/**").authenticated()
                // Playlists
                .requestMatchers(HttpMethod.GET, "/api/playlists/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/playlists/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/playlists/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/playlists/**").authenticated()
                // Preferences
                .requestMatchers(HttpMethod.GET, "/api/preferences/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/preferences/**").authenticated()
                // User preferences
                .requestMatchers(HttpMethod.GET, "/api/user-preferences/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/user-preferences/**").authenticated()
                // All other requests
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdArgumentResolver);
    }
}
