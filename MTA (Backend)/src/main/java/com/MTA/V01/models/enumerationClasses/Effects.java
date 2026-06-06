package com.MTA.V01.models.enumerationClasses;


import com.MTA.V01.models.Medicine;
import com.MTA.V01.models.enumerations.EEffects;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "Effects")
@NoArgsConstructor
@Setter
@Getter
public class Effects {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @JsonIgnore
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 35)
    private EEffects name;

}
