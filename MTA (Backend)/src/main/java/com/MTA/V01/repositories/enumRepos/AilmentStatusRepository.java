package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface AilmentStatusRepository extends JpaRepository<AilmentStatus ,Long> {
    Optional<AilmentStatus> findByName (EAilmentStatus name);

    boolean existsByName(EAilmentStatus name);
}
