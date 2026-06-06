package com.MTA.V01.payload.requests;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Setter
@Getter
public class LoginRequest {
    private String username;
    private String password;

}
