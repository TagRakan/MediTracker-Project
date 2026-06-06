package com.MTA.V01.repositories.enumRepos;

import com.MTA.V01.models.enumerationClasses.AilmentStatus;
import com.MTA.V01.models.enumerationClasses.Effects;
import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.EEffects;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface EffectsRepository  extends JpaRepository<Effects,Long> {
    Optional<Effects> findByName (EEffects name);

    boolean existsByName(EEffects name);
}
