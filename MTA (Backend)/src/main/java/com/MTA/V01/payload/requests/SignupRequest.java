package com.MTA.V01.payload.requests;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Date;
import java.util.Set;

@Setter
@Getter
public class SignupRequest {
    private String username;
    private String password;
    private String name;
    private LocalDate birthdate;

    private Set<String> roles;
}
