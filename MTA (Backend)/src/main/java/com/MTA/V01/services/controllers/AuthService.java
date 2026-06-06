package com.MTA.V01.services.controllers;

import com.MTA.V01.models.User;
import com.MTA.V01.models.enumerationClasses.Role;
import com.MTA.V01.models.enumerations.ERole;
import com.MTA.V01.payload.requests.LoginRequest;
import com.MTA.V01.payload.requests.SignupRequest;
import com.MTA.V01.payload.response.JwtResponse;
import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.repositories.enumRepos.RoleRepository;
import com.MTA.V01.security.jwt.JwtUtils;
import com.MTA.V01.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

//TODO make sure to remove case sensitivity when it comes to login requests

@Service
public class AuthService {
    @Autowired
    AuthenticationManager authenticationManager;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    JwtUtils jwtUtils;
    @Autowired
    LogServices logServices;

    public ResponseEntity<?> authenticateUser(LoginRequest loginRequest){
        if (!userRepository.existsByUsername(loginRequest.getUsername().toLowerCase())){
            return ResponseEntity.badRequest().body("user doesn't exist");
        }

        Authentication authentication;

        try {
             authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername().toLowerCase(), loginRequest.getPassword()));
        }catch (BadCredentialsException e){
            return ResponseEntity.badRequest().body("Incorrect username/password");
        }
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream().map(item -> item.getAuthority()).collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,userDetails.getName(),userDetails.getId(),userDetails.getUsername(),roles));
    }

    public ResponseEntity<?> registerUser(SignupRequest signupRequest){
        if (userRepository.existsByUsername(signupRequest.getUsername().toLowerCase())){
            return ResponseEntity.badRequest().body("Email already in use, please choose another one");
        }

        User user = new User(signupRequest.getUsername().toLowerCase(),encoder.encode(signupRequest.getPassword()),signupRequest.getName().toLowerCase(),signupRequest.getBirthdate());

        Set<String> strRoles = signupRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null){
            Role userRole = roleRepository.findByName(ERole.ROLE_USER).orElseThrow(()-> new RuntimeException("error: role not found"));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin": Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN).orElseThrow(()-> new RuntimeException("error: role not found"));
                         roles.add(adminRole);
                         break;
                    case "moderator": Role moderatorRole = roleRepository.findByName(ERole.ROLE_MODERATOR).orElseThrow(()-> new RuntimeException("error: role not found"));
                        roles.add(moderatorRole);
                        break;
                    case "user": Role userRole = roleRepository.findByName(ERole.ROLE_USER).orElseThrow(()-> new RuntimeException("error: role not found"));
                        roles.add(userRole);
                        break;
                }
            });
        }
        user.setRoles(roles);
        logServices.addLog("user "+user+" has been made");
        userRepository.save(user);
        return ResponseEntity.ok("User registered successfully!");
    }
}
