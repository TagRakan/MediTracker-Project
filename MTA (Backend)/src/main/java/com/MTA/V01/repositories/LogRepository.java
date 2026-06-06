package com.MTA.V01.repositories;

import com.MTA.V01.models.Log;
import com.MTA.V01.models.enumerations.ELogType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<Log,Long> {
    List<Log> findByDescriptionContainsIgnoreCase(String description);

    List<Log> findByLogType_Name(ELogType name);
}
