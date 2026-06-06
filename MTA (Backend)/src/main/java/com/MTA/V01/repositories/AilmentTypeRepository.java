package com.MTA.V01.repositories;

import com.MTA.V01.models.AilmentType;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface AilmentTypeRepository extends JpaRepository<AilmentType,Long> {
    Optional<AilmentType> findByName(EAilmentStatus eAilmentStatus);

    List<AilmentType> findByIsProtectedFalse();

    List<AilmentType> findByNameContainsIgnoreCaseAndIsProtectedFalse(String name);

    AilmentType findByIdAndIsProtectedTrue(Long id);

    boolean existsByIdAndIsProtectedTrue(Long id);

    List<AilmentType> findByNameContainsIgnoreCaseAndIsProtectedTrue(String name);

    List<AilmentType> findByIsCustomFalse();

    List<AilmentType> findByUser_Id(Long id);
}
