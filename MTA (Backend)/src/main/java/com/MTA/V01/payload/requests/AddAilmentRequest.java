package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class AddAilmentRequest {
    @NotBlank
    private String ailmentName;

    private String ailmentStatus;

    @NotNull
    private Long ailmentType;

}
