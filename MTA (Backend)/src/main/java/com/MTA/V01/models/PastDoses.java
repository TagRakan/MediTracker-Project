package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.DoseStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Calendar;
import java.util.Date;

//TODO add data safety

@Entity
@Table(name = "past_doses")
@NoArgsConstructor
@Getter
@Setter
public class PastDoses {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime date;

    @ManyToOne
    @JoinColumn(name = "dose_status")
    private DoseStatus doseStatus;

    @ManyToOne
    @JoinColumn(name = "dose_id")
    private Dose dose;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;


    public PastDoses(Dose dose, User user){
        this.dose=dose;
        this.user=user;
    }
}
