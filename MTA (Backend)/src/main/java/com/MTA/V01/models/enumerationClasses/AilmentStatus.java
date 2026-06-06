package com.MTA.V01.models.enumerationClasses;

import com.MTA.V01.models.Ailment;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "ailment_status")
@NoArgsConstructor
@Setter
@Getter
public class AilmentStatus {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @JsonIgnore
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 35)
    private EAilmentStatus name;

    @JsonIgnore
    @OneToMany(mappedBy = "ailmentStatus", cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Ailment> ailment;
}
