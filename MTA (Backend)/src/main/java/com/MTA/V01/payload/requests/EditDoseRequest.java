package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Getter
@Setter
public class EditDoseRequest {
    @Size(min = 3,max = 30)
    @NotBlank
    private String name;

    @NotNull
    private DayOfWeek dayOfWeek;

    @NotNull
    private LocalTime localTime;

    @NotNull
    private Integer doseInMilligram;

    @NotNull
    private Long MedicineId;
}
