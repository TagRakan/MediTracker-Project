package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AddAilmentTypeRequest {
    @NotBlank
    String name;

    @Size(max = 1000)
    String ailmentDescription;

    Boolean isCustom;

    Boolean isProtected;

    Boolean isPhysical;
}
