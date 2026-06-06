package com.MTA.V01.repositories;

import com.MTA.V01.models.PastDoses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PastDosesRepository extends JpaRepository<PastDoses,Long> {
    List<PastDoses> findByDose_DoseSimpleIdentifierAndUser_IdOrderByDateDesc(String doseSimpleIdentifier, Long id, Pageable pageable);
}
