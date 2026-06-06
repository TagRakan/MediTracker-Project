package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.RelationshipType;
import com.MTA.V01.models.enumerations.ERelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RelationshipTypeRepository extends JpaRepository<RelationshipType,Long> {

    boolean existsByName(ERelationshipType name);

    RelationshipType findByName(ERelationshipType name);
}
