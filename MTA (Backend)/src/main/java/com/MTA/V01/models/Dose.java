package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.DoseStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Date;
import java.util.List;
import java.util.Set;

//TODO add data safety

@Entity
@Table(name = "dose")
@NoArgsConstructor
@Setter
@Getter
public class Dose {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    private String name;

    private DayOfWeek doseDay;

    private LocalTime localTime;

    private Integer doseInMilligram;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate doseDate;

    @Size(max = 8)
    private String doseSimpleIdentifier;

    private Boolean isActive;


    public Dose(String name,DayOfWeek doseDay, LocalTime localTime, Integer doseInMilligram){
    this.name = name;
    this.doseDay=doseDay;
    this.localTime = localTime;
    this.doseInMilligram=doseInMilligram;

    }


    @JsonIgnore
    @OneToMany(mappedBy = "dose",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<PastDoses> pastDoses;

    @ManyToOne
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "added_by")
    private User addedBy;
}
