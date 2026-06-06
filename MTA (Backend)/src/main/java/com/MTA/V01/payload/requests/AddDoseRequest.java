package com.MTA.V01.payload.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Setter
@Getter
public class AddDoseRequest {
    @Size(min = 3, max = 30)
    @NotBlank
    private String name;

    @NotNull
    private List<DayOfWeek> dayOfWeek;
    @NotNull
    private List<LocalTime> localTime;

    @NotNull
    private List<Integer> doseInMilligram;

    @NotNull
    private Long medicineId;


    private LocalDate startDate;
    private LocalDate endDate;

    @Size(max = 8)
    private String simpleDoseIdentifier;
}
