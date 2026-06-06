package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.RelationshipType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@NoArgsConstructor
@Table(
        name = "family_relationships",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","related_user_id"})
)
public class FamilyRelationships {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "related_user_id")
    private User relatedUser;

    @ManyToOne
    @JoinColumn(name = "relationship_type")
    private RelationshipType relationshipType;

    public FamilyRelationships(User self, User target,RelationshipType relationshipType){
        user = self;
        relatedUser = target;
        this.relationshipType = relationshipType;
    }

}
