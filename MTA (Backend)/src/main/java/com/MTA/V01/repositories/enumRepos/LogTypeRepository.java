package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerationClasses.LogType;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.ELogType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface LogTypeRepository  extends JpaRepository<LogType,Long> {
    Optional<LogType> findByName (ELogType name);

    boolean existsByName(ELogType name);
}
