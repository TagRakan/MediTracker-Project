package com.MTA.V01.models.enumerationClasses;

import com.MTA.V01.models.Dose;
import com.MTA.V01.models.PastDoses;
import com.MTA.V01.models.enumerations.EDoseStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "Dose_status")
@NoArgsConstructor
@Setter
@Getter
public class DoseStatus {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @JsonIgnore
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 35)
    private EDoseStatus name;

    @JsonIgnore
    @OneToMany(mappedBy = "doseStatus",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<PastDoses> dose;

}
