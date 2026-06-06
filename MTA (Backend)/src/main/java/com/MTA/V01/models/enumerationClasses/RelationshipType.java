package com.MTA.V01.models.enumerationClasses;

import com.MTA.V01.models.FamilyRelationships;
import com.MTA.V01.models.enumerations.ERelationshipType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Setter
@Getter
@NoArgsConstructor
public class RelationshipType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ERelationshipType name;

    @JsonIgnore
    @OneToMany(mappedBy = "relationshipType",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<FamilyRelationships> familyRelationships;
}
