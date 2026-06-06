package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.LoginRequest;
import com.MTA.V01.payload.requests.SignupRequest;
import com.MTA.V01.services.controllers.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest){
        return authService.authenticateUser(loginRequest);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest){
        return authService.registerUser(signupRequest);
    }
}
