package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.DoseStatus;
import com.MTA.V01.models.enumerations.EDoseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
@Repository
public interface DoseStatusRepository  extends JpaRepository<DoseStatus,Long> {
    Optional<DoseStatus> findByName (EDoseStatus name);

    boolean existsByName(EDoseStatus name);

}
