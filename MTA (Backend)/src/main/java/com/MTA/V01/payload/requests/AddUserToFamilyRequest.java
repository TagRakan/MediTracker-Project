package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddUserToFamilyRequest {
    @NotBlank
    private String username;
    @Size(max = 6)
    private String familyCode;

    private String relationship;
}
