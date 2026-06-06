package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerationClasses.IngestionMethod;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.EIngestionMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface IngestionMethodRepository extends JpaRepository<IngestionMethod,Long> {
    Optional<IngestionMethod> findByName (EIngestionMethod name);

    boolean existsByName(EIngestionMethod name);
}

