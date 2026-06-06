package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerationClasses.SideEffect;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.ESideEffects;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SideEffectRepository  extends JpaRepository<SideEffect,Long> {
    Optional<SideEffect> findByName (ESideEffects name);

    boolean existsByName(ESideEffects name);
}
