package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Setter
@Getter
public class AddMedicineRequest {
    @NotBlank
    @Size(min = 5, max = 30)
    private String name;
    private Boolean isProtected;
    private Boolean isCustom;

    @NotEmpty
    private Set<String> effects;
    @NotEmpty
    private Set<String> restrictions;
    @NotEmpty
    private Set<String> ingestionMethods;
    @NotEmpty
    private Set<String> sideEffects;
}
