package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.Effects;
import com.MTA.V01.models.enumerationClasses.IngestionMethod;
import com.MTA.V01.models.enumerationClasses.Restriction;
import com.MTA.V01.models.enumerationClasses.SideEffect;
import com.MTA.V01.models.enumerations.EEffects;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Set;

//TODO add data safety

@Entity
@Table(name = "medicine")
@NoArgsConstructor
@Setter
@Getter
public class Medicine {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    @NotBlank
    private String name;

    private Boolean isCustom;

    private Boolean isProtected;

    public Medicine(String name, Boolean isProtected) {
        this.name = name;
        this.isProtected = isProtected;
    }

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(joinColumns = @JoinColumn(name = "effect_id"),
    inverseJoinColumns = @JoinColumn(name = "medicine_id"))
    private Set<Effects> effects;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(joinColumns = @JoinColumn(name = "restriction_id"),
    inverseJoinColumns = @JoinColumn(name = "medicine_id"))
    private Set<Restriction> restrictions;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(joinColumns = @JoinColumn(name = "ingestion_method_id"),
    inverseJoinColumns = @JoinColumn(name = "medicine_id"))
    private Set<IngestionMethod> ingestionMethods;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(joinColumns = @JoinColumn(name = "side_effect_id"),
            inverseJoinColumns = @JoinColumn(name = "medicine_id"))
    private Set<SideEffect> sideEffects;

    @JsonIgnore
    @OneToMany(mappedBy = "medicine",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Dose> dose;

    @JsonIgnore
    @ManyToOne
    private User user;
}
