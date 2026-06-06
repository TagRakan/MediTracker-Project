package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerationClasses.Restriction;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.ERestrictions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface RestrictionRepository extends JpaRepository<Restriction,Long> {
    Optional<Restriction> findByName (ERestrictions name);

    boolean existsByName(ERestrictions name);
}
